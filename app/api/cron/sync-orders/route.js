// app/api/cron/sync-orders/route.js
// Vercel Cron — live sync zamówień z ostatnich 7 dni z Shoper API.
// Wywoływany co 6 godzin przez Vercel Cron (vercel.json).
// Ręczny trigger: GET /api/cron/sync-orders  Header: Authorization: Bearer CRON_SECRET

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runETLPipeline } from '../../../../lib/crm/etl.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minut

// ─── Shoper config ─────────────────────────────────────────────────────────────

const SHOP_URL    = (process.env.SHOPER_URL ?? 'https://nadwyraz.com').replace(/^(?!https?:\/\/)/, 'https://').replace(/\/$/, '');
const API_TOKEN   = process.env.SHOPER_CLIENT_SECRET ?? process.env.SHOPER_API_TOKEN;
const HEADERS     = { Authorization: `Bearer ${API_TOKEN}`, Accept: 'application/json' };

const CONCURRENCY       = 4;
const RETRY_ATTEMPTS    = 3;
const RETRY_DELAY_MS    = 1000;
const RATE_LIMIT_DELAY  = 5000;
const BATCH_DELAY_MS    = 500;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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

// Binary search: first page where first order's date >= targetDate.
async function findStartPage(targetDate, totalPages) {
  let low = 1, high = totalPages;
  while (low < high) {
    const mid  = Math.floor((low + high) / 2);
    const data = await fetchOnePage(mid);
    const firstDate = (data.list?.[0]?.date ?? '9999-12-31').slice(0, 10);
    if (firstDate < targetDate) low = mid + 1;
    else high = mid;
  }
  return Math.max(1, low - 2); // 2-page buffer
}

async function fetchRecentOrders(cutoffDate) {
  // Get total page count
  const first = await fetchOnePage(1);
  const totalPages = Number(first.pages ?? 1);
  console.log(`[cron] API: ${totalPages} stron, cutoff: ${cutoffDate}`);

  // Binary search for start page
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

function normalizeOrder(order, productsMap) {
  const rawProducts = productsMap?.get(String(order.order_id)) ?? [];
  const products = rawProducts.map(p => ({
    name:         p.name     ?? '',
    qty:          Number(p.quantity ?? 1),
    price:        parseFloat(p.price ?? 0),
    product_code: p.code     ?? '',
  }));

  return {
    order_id: String(order.order_id ?? order.id ?? ''),
    email:    (order.email ?? order.client_email ?? '').toLowerCase().trim(),
    date:     (order.add_date ?? order.date_add ?? order.date ?? '').slice(0, 10),
    sum:      parseFloat(order.total_price ?? order.total ?? order.sum ?? 0),
    products,
  };
}

// ─── GET handler ───────────────────────────────────────────────────────────────

export async function GET(request) {
  // Weryfikacja CRON_SECRET
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
    // Cutoff: 7 dni temu
    const cutoffDate = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
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
    const orderIds   = rawOrders.map(o => String(o.order_id));
    const productsMap = await fetchProductsForOrders(orderIds);

    // 3. Normalizacja
    const normalized = rawOrders
      .map(o => normalizeOrder(o, productsMap))
      .filter(o => o.order_id && o.email && o.date);

    console.log(`[cron] znormalizowanych zamówień: ${normalized.length}`);

    // 4. ETL pipeline (bez recalculateLTV)
    const result = await runETLPipeline(normalized, sb, 'cron_sync');
    console.log(`[cron] ETL OK — klientów: ${result.clients ?? '?'}, eventów: ${result.events ?? '?'}`);

    // 5. Przelicz LTV raz po imporcie
    const { error: ltvErr } = await sb.rpc('recalculate_all_ltv');
    if (ltvErr) {
      console.error('[cron] LTV RPC error:', ltvErr.message);
    } else {
      console.log('[cron] LTV przeliczone ✅');
    }

    // 6. Zapisz do sync_log
    const durationMs = Date.now() - startedAt;
    await sb.from('sync_log').insert({
      source: 'cron_sync',
      status: 'success',
      rows_upserted: result.processed ?? normalized.length,
      meta: {
        orders:       rawOrders.length,
        clients:      result.clients ?? 0,
        cutoff_date:  cutoffDate,
        duration_ms:  durationMs,
      },
    });

    console.log(`[cron] zakończono w ${(durationMs / 1000).toFixed(1)}s`);

    return NextResponse.json({
      success: true,
      orders:  rawOrders.length,
      clients: result.clients ?? 0,
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
