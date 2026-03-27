#!/usr/bin/env node
// scripts/recalculate-taxonomy.js
// Przelicza client_taxonomy_summary na podstawie istniejących danych w bazie
// (client_product_events JOIN products) — bez pobierania czegokolwiek z Shopera.
//
// Uruchomienie:
//   node scripts/recalculate-taxonomy.js

require("dotenv").config({ path: require("path").join(__dirname, "../.env.local") });

const { createClient } = require("@supabase/supabase-js");

// ─── Konfiguracja ─────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const EVENTS_PAGE_SIZE  = 1000; // PostgREST hard limit per request
const UPSERT_BATCH_SIZE = 500;
const LOG_EVERY         = 10000; // loguj postęp co N klientów

// ─── Env check ────────────────────────────────────────────────────────────────

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Brakujące zmienne: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sortedByFreq(freq) {
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
}

async function batchUpsert(rows) {
  for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
    const batch = rows.slice(i, i + UPSERT_BATCH_SIZE);
    if (i === 0) {
      console.log("🔍 Przykładowy rekord (pierwszy z batcha):", JSON.stringify(batch[0], null, 2));
    }
    const { error } = await supabase
      .from("client_taxonomy_summary")
      .upsert(batch, { onConflict: "client_id" });
    if (error) throw new Error(`upsert error (batch ${i}): ${error.message}`);
  }
}

// ─── Krok 1: Produkty ─────────────────────────────────────────────────────────

async function loadProducts() {
  console.log("📦 Pobieranie produktów z tabeli products...");
  const { data, error } = await supabase
    .from("products")
    .select("ean, name, tags_granularne, tags_domenowe, filary_marki, okazje, segment_prezentowy, evergreen");
  if (error) throw new Error(`products fetch error: ${error.message}`);

  const eanMap  = new Map();
  const nameMap = new Map();

  for (const p of data ?? []) {
    if (p.ean)  eanMap.set(Number(p.ean), p);
    if (p.name) nameMap.set(p.name.toLowerCase(), p);
  }

  console.log(`   ✓ ${data.length} produktów, eanMap: ${eanMap.size}, nameMap: ${nameMap.size}`);
  return { eanMap, nameMap };
}

// ─── Krok 2: Eventy (paginacja) ───────────────────────────────────────────────

async function loadAllEvents() {
  console.log("📋 Pobieranie client_product_events (paginacja po " + EVENTS_PAGE_SIZE + ")...");
  const allEvents = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("client_product_events")
      .select("client_id, ean, product_name, season, is_promo, is_new_product, promo_code, shipping_cost, order_date, price_category_id, price_at_purchase")
      .range(offset, offset + EVENTS_PAGE_SIZE - 1);

    if (error) throw new Error(`events fetch error (offset ${offset}): ${error.message}`);
    if (!data || data.length === 0) break;

    allEvents.push(...data);
    process.stdout.write(`\r   pobrano: ${allEvents.length} eventów...`);

    if (data.length < EVENTS_PAGE_SIZE) break;
    offset += EVENTS_PAGE_SIZE;
  }

  console.log(`\n   ✓ łącznie ${allEvents.length} eventów`);
  return allEvents;
}

// ─── Krok 1b: Promocje ────────────────────────────────────────────────────────

async function loadPromotions() {
  console.log("🎯 Pobieranie promocji...");
  const { data, error } = await supabase
    .from("promotions")
    .select("id, promo_name, promo_type, start_date, end_date, season, free_shipping, requires_code, code_name, discount_type, discount_min, discount_max");
  if (error) throw new Error(`promotions fetch error: ${error.message}`);
  console.log(`   ✓ ${data.length} promocji`);
  return data ?? [];
}

// ─── Krok 1c: Price history ───────────────────────────────────────────────────

async function loadPriceHistory() {
  console.log("💰 Pobieranie price_history...");
  const { data, error } = await supabase
    .from("price_history")
    .select("category_id, date_from, date_to, avg_price");
  if (error) throw new Error(`price_history fetch error: ${error.message}`);
  console.log(`   ✓ ${data.length} rekordów price_history`);
  return data ?? [];
}

// ─── Krok 3: Grupowanie i matching ───────────────────────────────────────────

function matchProduct(event, eanMap, nameMap) {
  // Strategia 1: po EAN
  if (event.ean) {
    const p = eanMap.get(Number(event.ean));
    if (p) return p;
  }

  // Strategia 2: fallback po nazwie
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

// ─── Krok 4: Budowanie rekordów taksonomii ────────────────────────────────────

const SIGNAL_RANK = { promo_code: 4, price_below_benchmark: 3, free_shipping: 2, date_match: 1 };

function buildTaxonomyRows(byClient, eanMap, nameMap, promotions, priceHistory) {
  console.log(`\n🧮 Przeliczanie taksonomii dla ${byClient.size} klientów...`);

  // Lookup structures for promo matching
  const promoById = new Map(promotions.map((p) => [p.id, p]));

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
  let processed = 0;
  let withMatch = 0;

  for (const [client_id, events] of byClient) {
    const tagGranFreq       = {};
    const tagDomFreq        = {};
    const filarFreq         = {};
    const okazjeFreq        = {};
    const segFreq           = {};
    const seasonsFreq       = {};
    const productGroupFreq  = {};
    const totalEvents       = events.length;
    let evergreenCount      = 0;
    let promoCount          = 0;
    let newProductCount     = 0;
    let matchedAny          = false;

    // Promo matching state per client
    const promoMatches = new Map(); // promo_id -> { promo, orders_count, signals: Set, promo_codes_used: Set }
    let free_shipping_orders = 0;

    for (const ev of events) {
      // Pola bezpośrednio z eventu
      if (ev.season)         seasonsFreq[ev.season] = (seasonsFreq[ev.season] ?? 0) + 1;
      if (ev.is_promo)       promoCount++;
      if (ev.is_new_product) newProductCount++;

      const p = matchProduct(ev, eanMap, nameMap);
      if (p) {
        matchedAny = true;
        for (const t of p.tags_granularne  ?? []) tagGranFreq[t]    = (tagGranFreq[t]    ?? 0) + 1;
        for (const t of p.tags_domenowe    ?? []) tagDomFreq[t]     = (tagDomFreq[t]     ?? 0) + 1;
        for (const t of p.filary_marki     ?? []) filarFreq[t]      = (filarFreq[t]      ?? 0) + 1;
        for (const t of p.okazje           ?? []) okazjeFreq[t]     = (okazjeFreq[t]     ?? 0) + 1;
        if (p.segment_prezentowy) segFreq[p.segment_prezentowy]     = (segFreq[p.segment_prezentowy] ?? 0) + 1;
        if (p.product_group)      productGroupFreq[p.product_group] = (productGroupFreq[p.product_group] ?? 0) + 1;
        if (p.evergreen) evergreenCount++;
      }

      // ── Promo matching ──────────────────────────────────────────────────────
      const orderDate = ev.order_date ? ev.order_date.slice(0, 10) : null;
      if (!orderDate) continue;

      if (ev.shipping_cost === 0) free_shipping_orders++;

      // Map promo_id -> best signal for THIS event
      const eventSignals = new Map(); // promo_id -> signal string

      function setSignal(promoId, signal) {
        const current = eventSignals.get(promoId);
        if (!current || SIGNAL_RANK[signal] > (SIGNAL_RANK[current] ?? 0)) {
          eventSignals.set(promoId, signal);
        }
      }

      // Signal 1: promo_code match
      if (ev.promo_code) {
        const matchedPromo = promoByCode.get(ev.promo_code.toLowerCase());
        if (matchedPromo) setSignal(matchedPromo.id, "promo_code");
      }

      // Signal 2: price below benchmark
      if (ev.price_at_purchase !== null && ev.price_at_purchase !== undefined && ev.price_category_id) {
        const categoryHistory = priceHistoryByCategory.get(ev.price_category_id) ?? [];
        const ph = categoryHistory.find(
          (h) => orderDate >= h.date_from && (!h.date_to || orderDate <= h.date_to)
        );
        if (ph && ev.price_at_purchase < ph.avg_price * 0.99) {
          for (const promo of promotions) {
            if (!promo.start_date || !promo.end_date) continue;
            if (orderDate >= promo.start_date && orderDate <= promo.end_date) {
              setSignal(promo.id, "price_below_benchmark");
            }
          }
        }
      }

      // Signal 3: date match / free_shipping
      for (const promo of promotions) {
        if (!promo.start_date || !promo.end_date) continue;
        if (orderDate >= promo.start_date && orderDate <= promo.end_date) {
          const signal = ev.shipping_cost === 0 && promo.free_shipping ? "free_shipping" : "date_match";
          setSignal(promo.id, signal);
        }
      }

      // Accumulate event signals into promoMatches
      for (const [promoId, signal] of eventSignals) {
        if (!promoMatches.has(promoId)) {
          const promo = promoById.get(promoId);
          if (!promo) continue;
          promoMatches.set(promoId, { promo, orders_count: 0, signals: new Set(), promo_codes_used: new Set() });
        }
        const entry = promoMatches.get(promoId);
        entry.orders_count++;
        entry.signals.add(signal);
        if (signal === "promo_code" && ev.promo_code) entry.promo_codes_used.add(ev.promo_code);
      }
    }

    // Build promo_history
    const promo_history = [...promoMatches.values()]
      .map(({ promo, orders_count, signals, promo_codes_used }) => {
        const strongestSignal = [...signals].sort(
          (a, b) => (SIGNAL_RANK[b] ?? 0) - (SIGNAL_RANK[a] ?? 0)
        )[0] ?? "date_match";
        return {
          promo_name:       promo.promo_name,
          promo_type:       promo.promo_type,
          season:           promo.season,
          orders_count,
          signal:           strongestSignal,
          free_shipping:    signals.has("free_shipping"),
          promo_code_used:  promo_codes_used.size > 0 ? [...promo_codes_used][0] : null,
        };
      })
      .sort((a, b) => b.orders_count - a.orders_count);

    // promo_seasons: unique season values from all matched promos
    const promoSeasonsSet = new Set();
    for (const { promo } of promoMatches.values()) {
      for (const s of (Array.isArray(promo.season) ? promo.season : [promo.season]).filter(Boolean)) {
        promoSeasonsSet.add(s);
      }
    }
    const promo_seasons = [...promoSeasonsSet];

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
      promo_seasons,
      free_shipping_orders,
      updated_at: new Date().toISOString(),
    });

    processed++;
    if (matchedAny) withMatch++;

    if (processed % LOG_EVERY === 0) {
      console.log(`   ↳ ${processed}/${byClient.size} klientów (ze zmatchowanym produktem: ${withMatch})`);
    }
  }

  return { rows, processed, withMatch };
}

// ─── Krok 5: Upsert ──────────────────────────────────────────────────────────

async function upsertRows(rows) {
  console.log(`\n💾 Upsert ${rows.length} rekordów do client_taxonomy_summary (batch ${UPSERT_BATCH_SIZE})...`);
  await batchUpsert(rows);
  console.log("   ✓ upsert zakończony");
}

// ─── Krok 6: Odśwież widoki i LTV ─────────────────────────────────────────────

async function postProcess() {
  console.log("\n🔄 Wywołanie recalculate_all_ltv()...");
  const { error: ltvErr } = await supabase.rpc("recalculate_all_ltv");
  if (ltvErr) console.warn("   ⚠️  recalculate_all_ltv error:", ltvErr.message);
  else console.log("   ✓ LTV przeliczone");

  console.log("🔄 Wywołanie refresh_crm_views()...");
  const { error: viewErr } = await supabase.rpc("refresh_crm_views");
  if (viewErr) console.warn("   ⚠️  refresh_crm_views error:", viewErr.message);
  else console.log("   ✓ Widoki odświeżone");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const startedAt = Date.now();
  console.log("🚀 recalculate-taxonomy.js — start\n");

  const [{ eanMap, nameMap }, promotions, priceHistory] = await Promise.all([
    loadProducts(),
    loadPromotions(),
    loadPriceHistory(),
  ]);
  const events   = await loadAllEvents();
  const byClient = groupByClient(events);
  const { rows, processed, withMatch } = buildTaxonomyRows(byClient, eanMap, nameMap, promotions, priceHistory);

  await upsertRows(rows);
  await postProcess();

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`
✅ Gotowe (${elapsed}s)
   Klientów przetworzonych:       ${processed}
   Z przynajmniej 1 matchem:      ${withMatch}
   Bez żadnego matcha (puste {}): ${processed - withMatch}
`);
}

main().catch((err) => {
  console.error("❌ Błąd krytyczny:", err.message);
  process.exit(1);
});
