// lib/crm/etl.js
// Główna logika ETL: normalizacja → vault → taksonomia → okazje → profile → segmenty → upsert

import { createHash } from "crypto";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function md5(str) {
  return createHash("md5").update(str).digest("hex");
}

function normalizeEmail(email) {
  return String(email ?? "").toLowerCase().trim();
}

// ─── KROK 1: flattenShoperCSV ─────────────────────────────────────────────────

/**
 * Normalizuje nagłówki CSV z eksportu Shoper i spłaszcza produkty 1..59
 * do tablicy line-itemów.
 *
 * Wejście: array of row objects (z papaparse, klucze lowercase)
 * Wyjście: [{order_id, email, date, sum, product_name, qty, price, source_file}]
 */
export function flattenShoperCSV(rows) {
  const lineItems = [];

  for (const row of rows) {
    // Normalizacja pól zamówienia
    const order_id = String(
      row.order_id ?? row.id ?? row.numer ?? row["numer zamówienia"] ?? row.number ?? ""
    ).trim();
    const email = normalizeEmail(
      row.email ?? row["e-mail"] ?? row["adres e-mail"] ?? row.mail ?? ""
    );
    const date = String(
      row.date ?? row.data ?? row["data zamówienia"] ?? row.add_date ?? row.date_add ?? ""
    ).trim().slice(0, 10); // YYYY-MM-DD
    const sum = parseFloat(
      String(row.sum ?? row.suma ?? row["suma zamówienia"] ?? row.total ?? row.total_price ?? 0)
        .replace(",", ".")
    ) || 0;
    const sourceFile = row._source_file ?? "unknown";

    if (!order_id || !email || !date) continue;

    // Szukaj kolumn produktowych: product_name N, product_quantity N, product_price N
    // Shoper eksportuje do 59 pozycji na zamówienie
    let hasAnyProduct = false;

    for (let i = 1; i <= 59; i++) {
      const nameKey = `product_name ${i}`;
      const altNameKey = `nazwa produktu ${i}`;
      const qtyKey = `product_quantity ${i}`;
      const altQtyKey = `ilość ${i}`;
      const priceKey = `product_price ${i}`;
      const altPriceKey = `cena ${i}`;

      const productName = (row[nameKey] ?? row[altNameKey] ?? "").trim();
      if (!productName) continue;

      hasAnyProduct = true;
      const qty = parseInt(row[qtyKey] ?? row[altQtyKey] ?? "1") || 1;
      const price = parseFloat(
        String(row[priceKey] ?? row[altPriceKey] ?? "0").replace(",", ".")
      ) || 0;

      lineItems.push({
        order_id,
        email,
        date,
        sum,
        product_name: productName,
        qty,
        price,
        source_file: sourceFile,
      });
    }

    // Jeśli brak kolumn produktowych, dodaj jeden line-item "bez produktu"
    if (!hasAnyProduct) {
      lineItems.push({
        order_id,
        email,
        date,
        sum,
        product_name: null,
        qty: 1,
        price: sum,
        source_file: sourceFile,
      });
    }
  }

  return lineItems;
}

// ─── KROK 2: anonymizeAndVault ────────────────────────────────────────────────

/**
 * Dla każdego unikalnego emaila generuje client_id, zapisuje nowe wpisy do master_key,
 * filtruje exclusions, zastępuje email → client_id.
 */
export async function anonymizeAndVault(lineItems, supabase) {
  const uniqueEmails = [...new Set(lineItems.map((li) => li.email).filter(Boolean))];

  // Pobierz istniejące wpisy z master_key w batchach po 100 (unikamy 414 URI Too Large)
  const emailHashes = uniqueEmails.map(md5);

  const VAULT_FETCH_BATCH = 100;
  const existingRows = [];
  for (let i = 0; i < emailHashes.length; i += VAULT_FETCH_BATCH) {
    const batch = emailHashes.slice(i, i + VAULT_FETCH_BATCH);
    const { data, error: fetchError } = await supabase
      .from("master_key")
      .select("email_hash, client_id")
      .in("email_hash", batch);
    if (fetchError) throw new Error(`vault fetch error: ${fetchError.message}`);
    if (data) existingRows.push(...data);
  }
  const existing = existingRows;

  const existingMap = new Map(
    (existing ?? []).map((r) => [r.email_hash, r.client_id])
  );

  // Pobierz exclusions (emaile wykluczone z CRM — np. pracownicy)
  const { data: exclusionRows } = await supabase
    .from("exclusions")
    .select("email_hash");
  const excludedHashes = new Set((exclusionRows ?? []).map((r) => r.email_hash));

  // Generuj nowe wpisy dla nieznanych emaili
  const newVaultEntries = [];
  const emailToClientId = new Map();

  for (const email of uniqueEmails) {
    const hash = md5(email);
    if (excludedHashes.has(hash)) continue; // wykluczone — pomiń

    if (existingMap.has(hash)) {
      emailToClientId.set(email, existingMap.get(hash));
    } else {
      // Generuj deterministyczny client_id z MD5(email)
      const clientId = "NZ-" + hash.substring(0, 10).toUpperCase();
      emailToClientId.set(email, clientId);
      newVaultEntries.push({ email_hash: hash, client_id: clientId });
    }
  }

  // Batch insert nowych wpisów do master_key (ignoruj konflikty — concurrent upserts)
  if (newVaultEntries.length > 0) {
    const VAULT_BATCH = 200;
    for (let i = 0; i < newVaultEntries.length; i += VAULT_BATCH) {
      const batch = newVaultEntries.slice(i, i + VAULT_BATCH);
      const { error } = await supabase
        .from("master_key")
        .insert(batch, { ignoreDuplicates: true });
      if (error && !error.message.includes("duplicate")) {
        throw new Error(`vault insert error: ${error.message}`);
      }
    }
  }

  // Zastąp email → client_id, odfiltruj wykluczone
  const anonymized = lineItems
    .filter((li) => li.email && emailToClientId.has(li.email))
    .map((li) => ({
      ...li,
      client_id: emailToClientId.get(li.email),
      email: undefined, // usuń email ze struktury
    }));

  return anonymized;
}

// ─── KROK 3: mapWorldsAndTaxonomy ─────────────────────────────────────────────

/**
 * Pobiera produkty z Supabase i matchuje product_name (contains, case-insensitive).
 * Dołącza pola taksonomiczne lub oznacza UNMAPPED.
 */
export async function mapWorldsAndTaxonomy(lineItems, supabase) {
  const { data: products, error } = await supabase
    .from("products")
    .select("ean, name, tags_granularne, tags_domenowe, filary_marki, okazje, segment_prezentowy, evergreen");

  if (error) throw new Error(`products fetch error: ${error.message}`);

  const productList = products ?? [];

  // Build index: lowercase words → product dla szybkiego lookup
  const productIndex = productList.map((p) => ({
    ...p,
    _nameLower: (p.name ?? "").toLowerCase(),
  }));

  return lineItems.map((li) => {
    if (!li.product_name) {
      return { ...li, _mapped: false, _unmapped_reason: "no_product_name" };
    }

    const nameLower = li.product_name.toLowerCase();

    // Strategia: exact → starts-with → contains (w tej kolejności)
    let match =
      productIndex.find((p) => p._nameLower === nameLower) ??
      productIndex.find((p) => nameLower.startsWith(p._nameLower)) ??
      productIndex.find((p) => p._nameLower.includes(nameLower)) ??
      productIndex.find((p) => nameLower.includes(p._nameLower));

    if (!match) {
      return { ...li, _mapped: false, _unmapped_reason: "no_match" };
    }

    return {
      ...li,
      ean: match.ean,
      tags_granularne: match.tags_granularne ?? [],
      tags_domenowe: match.tags_domenowe ?? [],
      filary_marki: match.filary_marki ?? [],
      product_okazje: match.okazje ?? [],
      segment_prezentowy: match.segment_prezentowy ?? null,
      evergreen: match.evergreen ?? false,
      _mapped: true,
    };
  });
}

// ─── KROK 4: assignOccasion ───────────────────────────────────────────────────

// Kalendarz okazji: [label, { month (1-based), dayFrom, dayTo }]
const OCCASION_CALENDAR = [
  ["WALENTYNKI",        { month: 2,  from: 1,  to: 14 }],
  ["DZIEN_KOBIET",      { month: 3,  from: 1,  to: 8  }],
  ["DZIEN_MATKI",       { month: 5,  from: 10, to: 26 }],
  ["DZIEN_OJCA",        { month: 6,  from: 1,  to: 23 }],
  ["DZIEN_CHLOPAKA",    { month: 9,  from: 15, to: 30 }],
  ["DZIEN_NAUCZYCIELA", { month: 10, from: 1,  to: 14 }],
  ["BLACK_WEEK",        { month: 11, from: 20, to: 30 }],
  ["MIKOLAJKI",         { month: 12, from: 1,  to: 6  }],
  ["GWIAZDKA",          { month: 12, from: 1,  to: 24 }],
  ["DZIEN_MEZCZYZNY",   { month: 3,  from: 1,  to: 8  }], // zbieżny z DZIEN_KOBIET
];

export function assignOccasion(lineItems) {
  return lineItems.map((li) => {
    if (!li.date) return { ...li, occasion: null };

    const d = new Date(li.date);
    if (isNaN(d.getTime())) return { ...li, occasion: null };

    const month = d.getMonth() + 1; // 1-based
    const day = d.getDate();

    for (const [label, { month: m, from, to }] of OCCASION_CALENDAR) {
      if (month === m && day >= from && day <= to) {
        return { ...li, occasion: label };
      }
    }

    return { ...li, occasion: null };
  });
}

// ─── KROK 5: buildClientProfiles ─────────────────────────────────────────────

/**
 * Grupuje line-items po client_id i oblicza agregaty per klient.
 */
export function buildClientProfiles(lineItems) {
  const byClient = new Map();

  for (const li of lineItems) {
    if (!li.client_id) continue;
    if (!byClient.has(li.client_id)) {
      byClient.set(li.client_id, []);
    }
    byClient.get(li.client_id).push(li);
  }

  const profiles = [];

  for (const [client_id, items] of byClient) {
    // Unikalne zamówienia
    const orderMap = new Map();
    for (const li of items) {
      if (!orderMap.has(li.order_id)) {
        orderMap.set(li.order_id, { date: li.date, sum: li.sum, products: [] });
      }
      if (li.product_name) {
        orderMap.get(li.order_id).products.push(li.product_name);
      }
    }

    const orders = [...orderMap.values()].sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    const dates = orders.map((o) => o.date).filter(Boolean).sort();

    const first_order = dates[0] ?? null;
    const last_order = dates[dates.length - 1] ?? null;
    const orders_count = orders.length;

    // LTV = suma unikalnych zamówień
    const ltv = orders.reduce((s, o) => s + (o.sum ?? 0), 0);

    // Częstotliwość roczna
    let purchase_frequency_yearly = orders_count;
    if (first_order && last_order && first_order !== last_order) {
      const years =
        (new Date(last_order) - new Date(first_order)) / (365.25 * 86400 * 1000);
      purchase_frequency_yearly = years > 0 ? Math.round((orders_count / years) * 100) / 100 : orders_count;
    }

    // Ulubiony świat (najczęstszy tag domenowy)
    const domainFreq = {};
    for (const li of items) {
      for (const tag of li.tags_domenowe ?? []) {
        domainFreq[tag] = (domainFreq[tag] ?? 0) + 1;
      }
    }
    const ulubiony_swiat =
      Object.entries(domainFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const worlds_list = Object.keys(domainFreq).sort(
      (a, b) => domainFreq[b] - domainFreq[a]
    );

    // Lista okazji
    const events_list = [
      ...new Set(items.map((li) => li.occasion).filter(Boolean)),
    ];

    // Full order history (JSON)
    const full_order_history = orders.map((o) => ({
      date: o.date,
      sum: o.sum,
      products: o.products,
    }));

    profiles.push({
      client_id,
      first_order: first_order ? new Date(first_order).toISOString() : null,
      last_order: last_order ? new Date(last_order).toISOString() : null,
      orders_count,
      ltv: Math.round(ltv * 100) / 100,
      purchase_frequency_yearly,
      ulubiony_swiat,
      worlds_list,
      events_list,
      full_order_history,
    });
  }

  return profiles;
}

// ─── KROK 6: segmentClients ───────────────────────────────────────────────────

/**
 * Przypisuje segment i risk_level każdemu klientowi.
 * Segmentacja oparta na LTV (top %) i liczbie zamówień.
 */
export function segmentClients(clients) {
  // Sortuj po LTV malejąco dla percentyli
  const sorted = [...clients].sort((a, b) => b.ltv - a.ltv);
  const total = sorted.length;

  const top1Idx = Math.ceil(total * 0.01);      // top 1%
  const top3Idx = Math.ceil(total * 0.03);      // kolejne 2% (top 1–3%)

  const top1LtvThreshold = sorted[top1Idx - 1]?.ltv ?? Infinity;
  const top3LtvThreshold = sorted[top3Idx - 1]?.ltv ?? Infinity;

  const now = Date.now();

  return clients.map((client) => {
    // Risk level — dni od ostatniego zakupu
    const daysSinceLast = client.last_order
      ? Math.floor((now - new Date(client.last_order).getTime()) / (86400 * 1000))
      : 9999;

    let risk_level;
    if (daysSinceLast < 180)       risk_level = "OK";
    else if (daysSinceLast < 365)  risk_level = "Risk";
    else if (daysSinceLast < 730)  risk_level = "HighRisk";
    else                           risk_level = "Lost";

    // Segment
    let legacy_segment;
    if (client.ltv >= top1LtvThreshold) {
      legacy_segment = "Diamond";
    } else if (client.ltv >= top3LtvThreshold) {
      legacy_segment = "Platinum";
    } else if (client.orders_count >= 3 && client.ltv > 270) {
      legacy_segment = "Gold";
    } else if (client.orders_count >= 2) {
      legacy_segment = "Returning";
    } else {
      legacy_segment = "New";
    }

    // Winback priority
    const winback_priority =
      (legacy_segment === "Diamond" || legacy_segment === "Platinum") &&
      (risk_level === "Lost" || risk_level === "HighRisk")
        ? "VIP REANIMACJA"
        : null;

    return { ...client, legacy_segment, risk_level, winback_priority };
  });
}

// ─── KROK 7: upsertToSupabase ─────────────────────────────────────────────────

function sanitizeClient(c) {
  return {
    ...c,
    ltv: Math.min(Math.round((parseFloat(c.ltv) || 0) * 100) / 100, 9999999.99),
    purchase_frequency_yearly: Math.min(Math.round((parseFloat(c.purchase_frequency_yearly) || 0) * 100) / 100, 9999.99),
    orders_count: Math.min(parseInt(c.orders_count) || 0, 2147483647),
  };
}

const UPSERT_BATCH = 200;

async function batchUpsert(supabase, table, rows, onConflict) {
  for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
    const batch = rows.slice(i, i + UPSERT_BATCH);
    const { error } = await supabase
      .from(table)
      .upsert(batch, { onConflict, ignoreDuplicates: false });
    if (error) throw new Error(`upsert ${table} error: ${error.message}`);
  }
}

/**
 * Upsertuje klientów, eventy produktowe i sumaryczne taksonomie do Supabase.
 */
export async function upsertToSupabase(clients, lineItems, supabase) {
  // — clients_360 ─────────────────────────────────────────────────────────────
  const clientRows = clients.map((c) => {
    const s = sanitizeClient(c);
    return {
    client_id: s.client_id,
    first_order: s.first_order,
    last_order: s.last_order,
    orders_count: s.orders_count,
    ltv: s.ltv,
    legacy_segment: s.legacy_segment,
    risk_level: s.risk_level,
    winback_priority: s.winback_priority,
    ulubiony_swiat: s.ulubiony_swiat,
    worlds_list: s.worlds_list,
    events_list: s.events_list,
    purchase_frequency_yearly: s.purchase_frequency_yearly,
    full_order_history: s.full_order_history,
    updated_at: new Date().toISOString(),
  };
  });

  await batchUpsert(supabase, "clients_360", clientRows, "client_id");

  // — client_product_events ───────────────────────────────────────────────────
  // Wstawiamy tylko linie z product_name (pomijamy wiersze-sumy bez produktu)
  const eventRows = lineItems
    .filter((li) => li.client_id && li.product_name && li.date)
    .map((li) => ({
      client_id: li.client_id,
      ean: li.ean ?? null,
      product_name: li.product_name,
      order_date: new Date(li.date).toISOString(),
      quantity: li.qty ?? 1,
      line_total: li.price ?? 0,
      season: li.occasion ?? null,
    }));

  // client_product_events używa bigserial id — INSERT z ignoreDuplicates
  // (brak naturalnego unique key, nie robimy upsert na id)
  for (let i = 0; i < eventRows.length; i += UPSERT_BATCH) {
    const batch = eventRows.slice(i, i + UPSERT_BATCH);
    const { error } = await supabase
      .from("client_product_events")
      .insert(batch, { ignoreDuplicates: true });
    if (error && !error.message.includes("duplicate")) {
      throw new Error(`insert client_product_events error: ${error.message}`);
    }
  }

  // — client_taxonomy_summary ────────────────────────────────────────────────
  const byClient = new Map();
  for (const li of lineItems) {
    if (!li.client_id) continue;
    if (!byClient.has(li.client_id)) byClient.set(li.client_id, []);
    byClient.get(li.client_id).push(li);
  }

  const taxonomyRows = [];
  for (const [client_id, items] of byClient) {
    const tagGranFreq = {};
    const tagDomFreq = {};
    const filarFreq = {};
    const okazjeFreq = {};
    let totalItems = items.length;
    let evergreenCount = 0;

    for (const li of items) {
      for (const t of li.tags_granularne ?? []) tagGranFreq[t] = (tagGranFreq[t] ?? 0) + 1;
      for (const t of li.tags_domenowe ?? [])   tagDomFreq[t]  = (tagDomFreq[t]  ?? 0) + 1;
      for (const t of li.filary_marki ?? [])     filarFreq[t]   = (filarFreq[t]   ?? 0) + 1;
      if (li.occasion) okazjeFreq[li.occasion] = (okazjeFreq[li.occasion] ?? 0) + 1;
      if (li.evergreen) evergreenCount++;
    }

    const top5 = (freq) =>
      Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([k]) => k);

    const top3 = (freq) =>
      Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([k]) => k);

    // Dominujący segment prezentowy
    const segFreq = {};
    for (const li of items) {
      if (li.segment_prezentowy) segFreq[li.segment_prezentowy] = (segFreq[li.segment_prezentowy] ?? 0) + 1;
    }
    const top_segment = Object.entries(segFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const evergreen_ratio = totalItems > 0
      ? Math.round((evergreenCount / totalItems) * 10000) / 10000
      : 0;

    taxonomyRows.push({
      client_id,
      top_tags_granularne: top5(tagGranFreq),
      top_tags_domenowe: top3(tagDomFreq),
      top_filary_marki: top3(filarFreq),
      top_okazje: top5(okazjeFreq),
      top_segment,
      evergreen_ratio,
      updated_at: new Date().toISOString(),
    });
  }

  await batchUpsert(supabase, "client_taxonomy_summary", taxonomyRows, "client_id");

  return {
    clients: clientRows.length,
    events: eventRows.length,
    taxonomy: taxonomyRows.length,
  };
}

// ─── Pipeline runner ──────────────────────────────────────────────────────────

/**
 * Uruchamia pełny pipeline ETL na surowych zamówieniach (Shoper format).
 * Przyjmuje array zamówień [{order_id, email, date, sum, products[]}]
 * lub row objects z CSV (auto-detect po obecności `products` array).
 */
export async function runETLPipeline(rawOrders, supabase, sourceFile = "api") {
  // Jeśli zamówienia są z API Shoper (płaskie z products[]),
  // rozwiń do formatu line-items bezpośrednio
  let lineItems;

  if (rawOrders.length > 0 && Array.isArray(rawOrders[0].products)) {
    // Format z Shoper API — rozwiń products[]
    lineItems = rawOrders.flatMap((order) =>
      order.products.length > 0
        ? order.products.map((p) => ({
            order_id: order.order_id,
            email: order.email,
            date: order.date,
            sum: order.sum,
            product_name: p.name,
            qty: p.qty,
            price: p.price,
            source_file: sourceFile,
          }))
        : [{
            order_id: order.order_id,
            email: order.email,
            date: order.date,
            sum: order.sum,
            product_name: null,
            qty: 1,
            price: order.sum,
            source_file: sourceFile,
          }]
    );
  } else {
    // Format CSV rows — użyj flattenShoperCSV
    lineItems = flattenShoperCSV(rawOrders);
  }

  if (lineItems.length === 0) {
    return { processed: 0, unmapped: 0, clients: 0 };
  }

  console.log(`[ETL] start — ${lineItems.length} line-items, source: ${sourceFile}`);

  // Krok 2
  let withClientIds;
  try {
    withClientIds = await anonymizeAndVault(lineItems, supabase);
    console.log(`[ETL step 2] anonymizeAndVault OK — ${withClientIds.length} items`);
  } catch (err) {
    console.error("[ETL step 2] anonymizeAndVault FAILED:", err?.message, err?.stack);
    throw err;
  }

  // Krok 3
  let withTaxonomy;
  try {
    withTaxonomy = await mapWorldsAndTaxonomy(withClientIds, supabase);
    console.log(`[ETL step 3] mapWorldsAndTaxonomy OK — ${withTaxonomy.length} items`);
  } catch (err) {
    console.error("[ETL step 3] mapWorldsAndTaxonomy FAILED:", err?.message, err?.stack);
    throw err;
  }

  // Krok 4
  let withOccasions;
  try {
    withOccasions = assignOccasion(withTaxonomy);
    console.log(`[ETL step 4] assignOccasion OK`);
  } catch (err) {
    console.error("[ETL step 4] assignOccasion FAILED:", err?.message, err?.stack);
    throw err;
  }

  const unmapped = withOccasions.filter((li) => li._mapped === false).length;
  console.log(`[ETL] unmapped products: ${unmapped}`);

  // Krok 5
  let profiles;
  try {
    profiles = buildClientProfiles(withOccasions);
    console.log(`[ETL step 5] buildClientProfiles OK — ${profiles.length} clients`);
  } catch (err) {
    console.error("[ETL step 5] buildClientProfiles FAILED:", err?.message, err?.stack);
    throw err;
  }

  // Krok 6
  let segmented;
  try {
    segmented = segmentClients(profiles);
    console.log(`[ETL step 6] segmentClients OK`);
  } catch (err) {
    console.error("[ETL step 6] segmentClients FAILED:", err?.message, err?.stack);
    throw err;
  }

  // Krok 7
  let result;
  try {
    result = await upsertToSupabase(segmented, withOccasions, supabase);
    console.log(`[ETL step 7] upsertToSupabase OK — clients: ${result.clients}, events: ${result.events}`);
  } catch (err) {
    console.error("[ETL step 7] upsertToSupabase FAILED:", err?.message, err?.stack);
    throw err;
  }

  // Krok 8: odśwież widoki zmaterializowane
  try {
    await supabase.rpc("refresh_crm_views");
    console.log("[ETL step 8] refresh_crm_views OK");
  } catch (err) {
    console.error("[ETL step 8] refresh_crm_views FAILED:", err?.message);
    // widoki są opcjonalne — nie przerywamy ETL
  }

  return {
    processed: lineItems.length,
    unmapped,
    ...result,
  };
}
