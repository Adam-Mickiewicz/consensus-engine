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
      .select("client_id, ean, product_name, season, is_promo, is_new_product")
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

function buildTaxonomyRows(byClient, eanMap, nameMap) {
  console.log(`\n🧮 Przeliczanie taksonomii dla ${byClient.size} klientów...`);

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

    for (const ev of events) {
      // Pola bezpośrednio z eventu
      if (ev.season)         seasonsFreq[ev.season] = (seasonsFreq[ev.season] ?? 0) + 1;
      if (ev.is_promo)       promoCount++;
      if (ev.is_new_product) newProductCount++;

      const p = matchProduct(ev, eanMap, nameMap);
      if (!p) continue;

      matchedAny = true;
      for (const t of p.tags_granularne  ?? []) tagGranFreq[t]          = (tagGranFreq[t]          ?? 0) + 1;
      for (const t of p.tags_domenowe    ?? []) tagDomFreq[t]           = (tagDomFreq[t]           ?? 0) + 1;
      for (const t of p.filary_marki     ?? []) filarFreq[t]            = (filarFreq[t]            ?? 0) + 1;
      for (const t of p.okazje           ?? []) okazjeFreq[t]           = (okazjeFreq[t]           ?? 0) + 1;
      if (p.segment_prezentowy) segFreq[p.segment_prezentowy]           = (segFreq[p.segment_prezentowy] ?? 0) + 1;
      if (p.product_group)      productGroupFreq[p.product_group]       = (productGroupFreq[p.product_group] ?? 0) + 1;
      if (p.evergreen) evergreenCount++;
    }

    const evergreen_ratio = totalEvents > 0
      ? Math.min(100, Math.round((evergreenCount / totalEvents) * 10000) / 100)
      : 0;

    const new_products_ratio = totalEvents > 0
      ? Math.min(100, Math.round((newProductCount / totalEvents) * 10000) / 100)
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
      evergreen_count:        evergreenCount,
      promo_count:            promoCount,
      total_events:           totalEvents,
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

  const { eanMap, nameMap } = await loadProducts();
  const events              = await loadAllEvents();
  const byClient            = groupByClient(events);
  const { rows, processed, withMatch } = buildTaxonomyRows(byClient, eanMap, nameMap);

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
