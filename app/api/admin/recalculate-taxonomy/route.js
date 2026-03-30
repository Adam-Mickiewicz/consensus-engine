// app/api/admin/recalculate-taxonomy/route.js
// Uruchamia przeliczenie client_taxonomy_summary jako background job.
// Fire-and-forget: zwraca {ok: true, started: true} natychmiast.
// Wywoływany przez supabase/functions/recalculate-crm po refresh_crm_views.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const EVENTS_PAGE_SIZE  = 1000;
const UPSERT_BATCH_SIZE = 500;
const SIGNAL_RANK       = { promo_code: 4, price_below_benchmark: 3, free_shipping: 2, date_match: 1 };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sortedByFreq(freq) {
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
}

async function batchUpsert(sb, rows) {
  for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
    const batch = rows.slice(i, i + UPSERT_BATCH_SIZE);
    const { error } = await sb
      .from('client_taxonomy_summary')
      .upsert(batch, { onConflict: 'client_id' });
    if (error) throw new Error(`upsert error (batch ${i}): ${error.message}`);
  }
}

// ─── Data loaders ─────────────────────────────────────────────────────────────

async function loadProducts(sb) {
  const { data, error } = await sb
    .from('products')
    .select('ean, name, tags_granularne, tags_domenowe, filary_marki, okazje, segment_prezentowy, evergreen');
  if (error) throw new Error(`products fetch error: ${error.message}`);
  const eanMap  = new Map();
  const nameMap = new Map();
  for (const p of data ?? []) {
    if (p.ean)  eanMap.set(Number(p.ean), p);
    if (p.name) nameMap.set(p.name.toLowerCase(), p);
  }
  return { eanMap, nameMap };
}

async function loadAllEvents(sb) {
  const allEvents = [];
  let offset = 0;
  while (true) {
    const { data, error } = await sb
      .from('client_product_events')
      .select('client_id, ean, product_name, season, is_promo, is_new_product, promo_code, shipping_cost, order_date, price_category_id, price_at_purchase, order_id, order_sum, line_total')
      .range(offset, offset + EVENTS_PAGE_SIZE - 1);
    if (error) throw new Error(`events fetch error (offset ${offset}): ${error.message}`);
    if (!data || data.length === 0) break;
    allEvents.push(...data);
    if (data.length < EVENTS_PAGE_SIZE) break;
    offset += EVENTS_PAGE_SIZE;
  }

  // Compute shipping_cost from order_sum - SUM(line_total) where missing
  const orderLineTotals = new Map();
  for (const ev of allEvents) {
    if (!ev.order_id) continue;
    if (!orderLineTotals.has(ev.order_id)) {
      orderLineTotals.set(ev.order_id, { order_sum: parseFloat(ev.order_sum ?? 0), sum_line_total: 0 });
    }
    orderLineTotals.get(ev.order_id).sum_line_total += parseFloat(ev.line_total ?? 0);
  }
  const shippingByOrder = new Map();
  for (const [order_id, { order_sum, sum_line_total }] of orderLineTotals) {
    const computed = Math.round((order_sum - sum_line_total) * 100) / 100;
    shippingByOrder.set(order_id, computed >= 0 && computed <= 30 ? computed : null);
  }
  for (const ev of allEvents) {
    if (ev.shipping_cost !== null && ev.shipping_cost !== undefined) continue;
    const computed = shippingByOrder.get(ev.order_id);
    if (computed !== null && computed !== undefined) ev.shipping_cost = computed;
  }
  return allEvents;
}

async function loadPromotions(sb) {
  const { data, error } = await sb
    .from('promotions')
    .select('id, promo_name, promo_type, start_date, end_date, season, free_shipping, requires_code, code_name, discount_type, discount_min, discount_max');
  if (error) throw new Error(`promotions fetch error: ${error.message}`);
  return data ?? [];
}

async function loadPriceHistory(sb) {
  const { data, error } = await sb
    .from('price_history')
    .select('category_id, date_from, date_to, avg_price');
  if (error) throw new Error(`price_history fetch error: ${error.message}`);
  return data ?? [];
}

// ─── Matching & grouping ──────────────────────────────────────────────────────

function matchProduct(event, eanMap, nameMap) {
  if (event.ean) {
    const p = eanMap.get(Number(event.ean));
    if (p) return p;
  }
  if (event.product_name) {
    const nameLower = event.product_name.toLowerCase();
    return (
      nameMap.get(nameLower) ??
      [...nameMap.entries()].find(([k]) => nameLower.startsWith(k))?.[1] ??
      [...nameMap.entries()].find(([k]) => k.includes(nameLower))?.[1] ??
      [...nameMap.entries()].find(([k]) => nameLower.includes(k))?.[1] ??
      null
    );
  }
  return null;
}

function groupByClient(events) {
  const map = new Map();
  for (const ev of events) {
    if (!ev.client_id) continue;
    if (!map.has(ev.client_id)) map.set(ev.client_id, []);
    map.get(ev.client_id).push(ev);
  }
  return map;
}

// ─── Taxonomy rows ────────────────────────────────────────────────────────────

function buildTaxonomyRows(byClient, eanMap, nameMap, promotions, priceHistory) {
  const promoById  = new Map(promotions.map((p) => [p.id, p]));
  const promoByCode = new Map();
  for (const promo of promotions) {
    if (promo.code_name) promoByCode.set(promo.code_name.toLowerCase(), promo);
  }
  const priceHistoryByCategory = new Map();
  for (const ph of priceHistory) {
    if (!priceHistoryByCategory.has(ph.category_id)) priceHistoryByCategory.set(ph.category_id, []);
    priceHistoryByCategory.get(ph.category_id).push(ph);
  }

  const rows = [];

  for (const [client_id, events] of byClient) {
    const tagGranFreq      = {};
    const tagDomFreq       = {};
    const filarFreq        = {};
    const okazjeFreq       = {};
    const segFreq          = {};
    const seasonsFreq      = {};
    const productGroupFreq = {};
    const totalEvents      = events.length;
    let evergreenCount     = 0;
    let promoCount         = 0;
    let newProductCount    = 0;
    const promoMatches     = new Map();
    let free_shipping_orders = 0;

    for (const ev of events) {
      if (ev.season)         seasonsFreq[ev.season] = (seasonsFreq[ev.season] ?? 0) + 1;
      if (ev.is_promo)       promoCount++;
      if (ev.is_new_product) newProductCount++;

      const p = matchProduct(ev, eanMap, nameMap);
      if (p) {
        for (const t of p.tags_granularne  ?? []) tagGranFreq[t]  = (tagGranFreq[t]  ?? 0) + 1;
        for (const t of p.tags_domenowe    ?? []) tagDomFreq[t]   = (tagDomFreq[t]   ?? 0) + 1;
        for (const t of p.filary_marki     ?? []) filarFreq[t]    = (filarFreq[t]    ?? 0) + 1;
        for (const t of p.okazje           ?? []) okazjeFreq[t]   = (okazjeFreq[t]   ?? 0) + 1;
        if (p.segment_prezentowy) segFreq[p.segment_prezentowy]   = (segFreq[p.segment_prezentowy] ?? 0) + 1;
        if (p.product_group)      productGroupFreq[p.product_group] = (productGroupFreq[p.product_group] ?? 0) + 1;
        if (p.evergreen) evergreenCount++;
      }

      const orderDate = ev.order_date ? ev.order_date.slice(0, 10) : null;
      if (!orderDate) continue;
      if (ev.shipping_cost === 0) free_shipping_orders++;

      const eventSignals = new Map();
      function setSignal(promoId, signal) {
        const current = eventSignals.get(promoId);
        if (!current || SIGNAL_RANK[signal] > (SIGNAL_RANK[current] ?? 0)) {
          eventSignals.set(promoId, signal);
        }
      }

      if (ev.promo_code) {
        const matchedPromo = promoByCode.get(ev.promo_code.toLowerCase());
        if (matchedPromo) setSignal(matchedPromo.id, 'promo_code');
      }
      if (ev.price_at_purchase !== null && ev.price_at_purchase !== undefined && ev.price_category_id) {
        const categoryHistory = priceHistoryByCategory.get(ev.price_category_id) ?? [];
        const ph = categoryHistory.find(
          (h) => orderDate >= h.date_from && (!h.date_to || orderDate <= h.date_to)
        );
        if (ph && ev.price_at_purchase < ph.avg_price * 0.99) {
          for (const promo of promotions) {
            if (!promo.start_date || !promo.end_date) continue;
            if (orderDate >= promo.start_date && orderDate <= promo.end_date) {
              setSignal(promo.id, 'price_below_benchmark');
            }
          }
        }
      }
      for (const promo of promotions) {
        if (!promo.start_date || !promo.end_date) continue;
        if (orderDate >= promo.start_date && orderDate <= promo.end_date) {
          const signal = ev.shipping_cost === 0 && promo.free_shipping ? 'free_shipping' : 'date_match';
          setSignal(promo.id, signal);
        }
      }

      for (const [promoId, signal] of eventSignals) {
        if (!promoMatches.has(promoId)) {
          const promo = promoById.get(promoId);
          if (!promo) continue;
          promoMatches.set(promoId, { promo, orders_count: 0, signals: new Set(), promo_codes_used: new Set() });
        }
        const entry = promoMatches.get(promoId);
        entry.orders_count++;
        entry.signals.add(signal);
        if (signal === 'promo_code' && ev.promo_code) entry.promo_codes_used.add(ev.promo_code);
      }
    }

    const promo_history = [...promoMatches.values()]
      .map(({ promo, orders_count, signals, promo_codes_used }) => {
        const strongestSignal = [...signals].sort(
          (a, b) => (SIGNAL_RANK[b] ?? 0) - (SIGNAL_RANK[a] ?? 0)
        )[0] ?? 'date_match';
        return {
          promo_name:      promo.promo_name,
          promo_type:      promo.promo_type,
          season:          promo.season,
          orders_count,
          signal:          strongestSignal,
          free_shipping:   signals.has('free_shipping'),
          promo_code_used: promo_codes_used.size > 0 ? [...promo_codes_used][0] : null,
        };
      })
      .sort((a, b) => b.orders_count - a.orders_count);

    const promoSeasonsSet = new Set();
    for (const { promo } of promoMatches.values()) {
      for (const s of (Array.isArray(promo.season) ? promo.season : [promo.season]).filter(Boolean)) {
        promoSeasonsSet.add(s);
      }
    }

    const evergreen_ratio = totalEvents > 0
      ? Math.min(100, Math.max(0, Math.round((evergreenCount / totalEvents) * 10000) / 100))
      : 0;
    const new_products_ratio = totalEvents > 0
      ? Math.min(100, Math.max(0, Math.round((newProductCount / totalEvents) * 10000) / 100))
      : 0;
    const top_segment = Object.entries(segFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const top_segments = Object.entries(segFreq)
      .sort((a, b) => b[1] - a[1])
      .map(([segment, count]) => ({ segment, count }));

    rows.push({
      client_id,
      top_tags_granularne:    sortedByFreq(tagGranFreq),
      top_tags_domenowe:      sortedByFreq(tagDomFreq),
      top_filary_marki:       sortedByFreq(filarFreq),
      top_okazje:             sortedByFreq(okazjeFreq),
      top_segment,
      evergreen_ratio,
      tags_granularne_counts: tagGranFreq,
      tags_domenowe_counts:   tagDomFreq,
      filary_marki_counts:    filarFreq,
      okazje_counts:          okazjeFreq,
      top_segments,
      seasons_counts:         seasonsFreq,
      product_groups_counts:  productGroupFreq,
      new_products_ratio,
      evergreen_count:        Math.round(evergreenCount),
      promo_count:            Math.round(promoCount),
      total_events:           Math.round(totalEvents),
      promo_history,
      promo_seasons:          [...promoSeasonsSet],
      free_shipping_orders,
      updated_at:             new Date().toISOString(),
    });
  }

  return rows;
}

// ─── Main job ─────────────────────────────────────────────────────────────────

async function runTaxonomyJob(sb, startedAt) {
  try {
    console.log('[recalculate-taxonomy] start');

    const [{ eanMap, nameMap }, promotions, priceHistory] = await Promise.all([
      loadProducts(sb),
      loadPromotions(sb),
      loadPriceHistory(sb),
    ]);
    const events   = await loadAllEvents(sb);
    const byClient = groupByClient(events);
    const rows     = buildTaxonomyRows(byClient, eanMap, nameMap, promotions, priceHistory);

    console.log(`[recalculate-taxonomy] budowanie wierszy OK — ${rows.length} klientów`);

    await batchUpsert(sb, rows);

    const durationMs = Date.now() - startedAt;
    console.log(`[recalculate-taxonomy] upsert OK (${(durationMs / 1000).toFixed(1)}s)`);

    await sb.from('sync_log').insert({
      source:        'recalculate_taxonomy',
      status:        'success',
      rows_upserted: rows.length,
      meta:          { clients: rows.length, events: events.length, duration_ms: durationMs },
    }).catch(() => {});
  } catch (err) {
    console.error('[recalculate-taxonomy] błąd:', err.message);
    await sb.from('sync_log').insert({
      source:        'recalculate_taxonomy',
      status:        'error',
      rows_upserted: 0,
      meta:          { error: err.message, duration_ms: Date.now() - startedAt },
    }).catch(() => {});
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request) {
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

  // Fire and forget — nie czekamy na zakończenie
  setImmediate(() => {
    runTaxonomyJob(sb, startedAt).catch(() => {});
  });

  return NextResponse.json({ ok: true, started: true });
}
