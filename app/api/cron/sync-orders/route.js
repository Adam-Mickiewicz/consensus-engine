// app/api/cron/sync-orders/route.js
// Vercel Cron — szybki insert surowych zamówień z ostatnich 2 dni z Shoper API.
// Bez pełnego ETL pipeline — tylko insert do master_key, client_product_events, clients_360.
// LTV, taksonomia i segmenty przeliczane przez Edge Function recalculate-crm (pg_cron o 10:00).
//
// Ręczny trigger: GET /api/cron/sync-orders  Header: Authorization: Bearer CRON_SECRET

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { encrypt } from '../../../../lib/crypto/pii.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ─── Shoper config ─────────────────────────────────────────────────────────────

const SHOP_URL   = (process.env.SHOPER_URL ?? 'https://nadwyraz.com').replace(/^(?!https?:\/\/)/, 'https://').replace(/\/$/, '');
const API_TOKEN  = process.env.SHOPER_CLIENT_SECRET ?? process.env.SHOPER_API_TOKEN;
const HEADERS    = { Authorization: `Bearer ${API_TOKEN}`, Accept: 'application/json' };

const CONCURRENCY      = 4;
const RETRY_ATTEMPTS   = 3;
const RETRY_DELAY_MS   = 1000;
const RATE_LIMIT_DELAY = 5000;
const BATCH_DELAY_MS   = 500;
const UPSERT_BATCH     = 200;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function md5(str) { return createHash('md5').update(str).digest('hex'); }

function clientIdFromEmail(email) {
  return 'NZ-' + md5(email).substring(0, 10).toUpperCase();
}

async function withRetry(fn, label) {
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const is429 = err.message?.includes('429') || err.message?.includes('requests limit');
      const delay = is429 ? RATE_LIMIT_DELAY : RETRY_DELAY_MS;
      if (attempt < RETRY_ATTEMPTS) {
        console.warn(`[cron] ${label} — retry ${attempt}/${RETRY_ATTEMPTS} in ${delay}ms: ${err.message}`);
        await sleep(delay);
      } else {
        throw err;
      }
    }
  }
}

// ─── Shoper API ────────────────────────────────────────────────────────────────

async function fetchOnePage(page) {
  const params = new URLSearchParams({
    limit: '50',
    page:  String(page),
    'sort[date]': 'ASC',
  });
  return withRetry(async () => {
    const res = await fetch(`${SHOP_URL}/webapi/rest/orders?${params}`, { headers: HEADERS });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`orders page ${page} (${res.status}): ${body.slice(0, 200)}`);
    }
    return res.json();
  }, `orders page ${page}`);
}

async function findStartPage(targetDate, totalPages) {
  let low = 1, high = totalPages;
  while (low < high) {
    const mid  = Math.floor((low + high) / 2);
    const data = await fetchOnePage(mid);
    const firstDate = (data.list?.[0]?.date ?? '9999-12-31').slice(0, 10);
    if (firstDate < targetDate) low = mid + 1;
    else high = mid;
  }
  return Math.max(1, low - 2);
}

async function fetchRecentOrders(cutoffDate) {
  const first = await fetchOnePage(1);
  const totalPages = Number(first.pages ?? 1);
  console.log(`[cron] API: ${totalPages} stron, cutoff: ${cutoffDate}`);

  const startPage = await findStartPage(cutoffDate, totalPages);
  console.log(`[cron] Start page: ${startPage}`);

  const orders = [];
  let page = startPage;

  while (true) {
    const data = await fetchOnePage(page);
    const list = data.list ?? [];
    if (!list.length) break;
    for (const order of list) {
      const orderDate = (order.date ?? '').slice(0, 10);
      if (orderDate >= cutoffDate) orders.push(order);
    }
    const count = Number(data.count ?? 0);
    if (page * 50 >= count) break;
    page++;
  }

  return orders.filter(o => (o.date ?? '').slice(0, 10) >= cutoffDate);
}

async function fetchProductsForOrders(orderIds) {
  const productsByOrderId = new Map();

  for (let i = 0; i < orderIds.length; i += CONCURRENCY) {
    const batch = orderIds.slice(i, i + CONCURRENCY);

    const results = await Promise.all(batch.map(id =>
      withRetry(async () => {
        const res = await fetch(
          `${SHOP_URL}/webapi/rest/order-products?filters[order_id]=${id}&limit=50`,
          { headers: HEADERS }
        );
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          throw new Error(`order-products ${id} (${res.status}): ${body.slice(0, 200)}`);
        }
        const json = await res.json();
        return { id, items: json.list ?? [] };
      }, `order-products ${id}`)
    ));

    for (const { id, items } of results) {
      if (items.length > 0) productsByOrderId.set(String(id), items);
    }

    if (i + CONCURRENCY < orderIds.length) await sleep(BATCH_DELAY_MS);
  }

  return productsByOrderId;
}

// ─── Fast insert ───────────────────────────────────────────────────────────────

async function fastInsert(rawOrders, productsMap, sb) {
  // 1. Unikalne emaile → client_id
  const uniqueEmails = [...new Set(
    rawOrders.map(o => (o.email ?? o.client_email ?? '').toLowerCase().trim()).filter(Boolean)
  )];

  // 2. Pobierz wykluczone emaile
  const emailHashes = uniqueEmails.map(e => md5(e));
  const { data: exclusionRows } = await sb.from('exclusions').select('email_hash');
  const excludedHashes = new Set((exclusionRows ?? []).map(r => r.email_hash));

  const allowedEmails = uniqueEmails.filter(e => !excludedHashes.has(md5(e)));
  const emailToClientId = new Map(allowedEmails.map(e => [e, clientIdFromEmail(e)]));

  // 3. Upsert master_key (tylko nowe wpisy)
  const vaultRows = allowedEmails.map(email => ({
    email_hash:      md5(email),
    client_id:       emailToClientId.get(email),
    encrypted_email: encrypt(email),
  }));
  for (let i = 0; i < vaultRows.length; i += UPSERT_BATCH) {
    await sb.from('master_key')
      .upsert(vaultRows.slice(i, i + UPSERT_BATCH), { onConflict: 'email_hash', ignoreDuplicates: true });
  }

  // 4. Zbuduj event rows z zamówień + produktów
  const eventRows = [];
  const clientOrderMap = new Map(); // client_id → { dates[], sums[] }

  for (const order of rawOrders) {
    const email = (order.email ?? order.client_email ?? '').toLowerCase().trim();
    const client_id = emailToClientId.get(email);
    if (!client_id) continue; // wykluczone

    const order_id  = String(order.order_id ?? order.id ?? '');
    const order_date = (order.add_date ?? order.date_add ?? order.date ?? '').slice(0, 10);
    const order_sum  = parseFloat(order.total_price ?? order.total ?? order.sum ?? 0);
    const promo_code = order.promo_code ?? order.discount_code ?? null;
    const shipping_cost = parseFloat(order.delivery_price ?? order.shipping_price ?? 0);
    const discount_code = parseFloat(order.discount_client ?? 0);
    const is_promo = !!(promo_code || order.is_promo);

    if (!order_id || !order_date) continue;

    // Zbierz daty/sumy per klient dla clients_360
    if (!clientOrderMap.has(client_id)) clientOrderMap.set(client_id, { dates: [], sums: [] });
    clientOrderMap.get(client_id).dates.push(order_date);
    clientOrderMap.get(client_id).sums.push(order_sum);

    const rawProducts = productsMap.get(order_id) ?? [];

    if (rawProducts.length === 0) {
      // Zamówienie bez pozycji — wstaw jeden wiersz
      eventRows.push({
        client_id,
        order_id,
        order_date:    new Date(order_date).toISOString(),
        order_sum,
        ean:           null,
        product_name:  null,
        quantity:      1,
        line_total:    order_sum,
        is_promo,
        is_new_product: false,
        promo_code,
        discount_code,
        shipping_cost,
      });
    } else {
      for (const p of rawProducts) {
        const eanRaw = p.code ?? p.product_code ?? null;
        const ean    = eanRaw ? (Number(String(eanRaw).trim()) || null) : null;
        eventRows.push({
          client_id,
          order_id,
          order_date:    new Date(order_date).toISOString(),
          order_sum,
          ean,
          product_name:  p.name ?? null,
          quantity:      Number(p.quantity ?? 1),
          line_total:    parseFloat(p.price ?? 0) * Number(p.quantity ?? 1),
          is_promo,
          is_new_product: false,
          promo_code,
          discount_code,
          shipping_cost,
        });
      }
    }
  }

  // 5. Upsert client_product_events
  for (let i = 0; i < eventRows.length; i += UPSERT_BATCH) {
    const batch = eventRows.slice(i, i + UPSERT_BATCH);
    const { error } = await sb
      .from('client_product_events')
      .upsert(batch, { onConflict: 'order_id,ean,product_name', ignoreDuplicates: true });
    if (error) throw new Error(`upsert client_product_events: ${error.message}`);
  }

  // 6. Upsert clients_360 — merge z istniejącymi danymi
  const clientIds = [...clientOrderMap.keys()];
  const existingMap = new Map();
  for (let i = 0; i < clientIds.length; i += UPSERT_BATCH) {
    const batchIds = clientIds.slice(i, i + UPSERT_BATCH);
    const { data } = await sb
      .from('clients_360')
      .select('client_id, first_order, last_order, orders_count, ltv')
      .in('client_id', batchIds);
    for (const row of data ?? []) existingMap.set(row.client_id, row);
  }

  const clientRows = clientIds.map(client_id => {
    const { dates, sums } = clientOrderMap.get(client_id);
    const newFirst  = dates.sort()[0];
    const newLast   = [...dates].sort().reverse()[0];
    const newCount  = dates.length;
    const newLtv    = sums.reduce((s, v) => s + v, 0);

    const existing  = existingMap.get(client_id);
    const firstOrder = [existing?.first_order?.slice(0, 10), newFirst].filter(Boolean).sort()[0];
    const lastOrder  = [existing?.last_order?.slice(0, 10), newLast].filter(Boolean).sort().reverse()[0];
    const ordersCount = (existing?.orders_count ?? 0) + newCount;
    const ltv = Math.round(((existing?.ltv ?? 0) + newLtv) * 100) / 100;

    return {
      client_id,
      first_order:  firstOrder ? new Date(firstOrder).toISOString() : null,
      last_order:   lastOrder  ? new Date(lastOrder).toISOString()  : null,
      orders_count: ordersCount,
      ltv:          Math.min(ltv, 9999999.99),
      updated_at:   new Date().toISOString(),
    };
  });

  for (let i = 0; i < clientRows.length; i += UPSERT_BATCH) {
    const { error } = await sb
      .from('clients_360')
      .upsert(clientRows.slice(i, i + UPSERT_BATCH), { onConflict: 'client_id', ignoreDuplicates: false });
    if (error) throw new Error(`upsert clients_360: ${error.message}`);
  }

  return { clients: clientIds.length, events: eventRows.length };
}

// ─── GET handler ───────────────────────────────────────────────────────────────

export async function GET(request) {
  const auth = request.headers.get('authorization') ?? '';
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const startedAt = Date.now();

  try {
    const cutoffDate = new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10);
    console.log(`[cron] sync-orders start — cutoff: ${cutoffDate}`);

    // 1. Pobierz zamówienia
    const rawOrders = await fetchRecentOrders(cutoffDate);
    console.log(`[cron] zamówień od ${cutoffDate}: ${rawOrders.length}`);

    if (rawOrders.length === 0) {
      await sb.from('sync_log').insert({
        source: 'cron_sync',
        status: 'success',
        rows_upserted: 0,
        meta: { orders: 0, clients: 0, cutoff_date: cutoffDate },
      });
      return NextResponse.json({ success: true, orders: 0, clients: 0 });
    }

    // 2. Pobierz produkty
    const orderIds   = rawOrders.map(o => String(o.order_id ?? o.id ?? ''));
    const productsMap = await fetchProductsForOrders(orderIds);

    // 3. Szybki insert (bez ETL)
    const result = await fastInsert(rawOrders, productsMap, sb);
    console.log(`[cron] insert OK — klientów: ${result.clients}, eventów: ${result.events}`);

    // 4. Zapisz do sync_log
    const durationMs = Date.now() - startedAt;
    await sb.from('sync_log').insert({
      source: 'cron_sync',
      status: 'success',
      rows_upserted: result.events,
      meta: {
        orders:      rawOrders.length,
        clients:     result.clients,
        events:      result.events,
        cutoff_date: cutoffDate,
        duration_ms: durationMs,
      },
    });

    console.log(`[cron] zakończono w ${(durationMs / 1000).toFixed(1)}s`);

    return NextResponse.json({
      success: true,
      orders:  rawOrders.length,
      clients: result.clients,
      events:  result.events,
    });

  } catch (err) {
    console.error('[cron] błąd:', err.message);
    await sb.from('sync_log').insert({
      source: 'cron_sync',
      status: 'error',
      rows_upserted: 0,
      meta: { error: err.message, duration_ms: Date.now() - startedAt },
    }).catch(() => {});

    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
