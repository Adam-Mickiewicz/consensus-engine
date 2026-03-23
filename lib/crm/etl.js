// lib/crm/etl.js
// Główna logika ETL: normalizacja → vault → taksonomia → okazje → profile → segmenty → upsert

import { createHash } from "crypto";
import { encrypt } from "../crypto/pii.js";

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
      // Szyfruj PII — email_encrypted przechowuje zaszyfrowaną kopię do deszyfrowania przez admina
      // email (plaintext) pozostaje do kompatybilności wstecznej z eksportem edrone
      const email_encrypted = encrypt(email);
      newVaultEntries.push({ email_hash: hash, client_id: clientId, email, email_encrypted });
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
    .select("ean, name, tags_granularne, tags_domenowe, filary_marki, okazje, segment_prezentowy, evergreen, created_at");

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
      product_created_at: match.created_at ?? null,
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

// ─── KROK 4.5: assignPromoAndNewProduct ──────────────────────────────────────

/**
 * Wyznacza category_id produktu na podstawie słownika mapowania.
 * Dłuższe słowa kluczowe mają priorytet (np. "torba na książki" > "torba").
 */
function getCategoryFromProductName(productName, mappings) {
  if (!productName || !mappings?.length) return null;
  const lower = productName.toLowerCase();
  // Sortuj malejąco po długości keyword — dłuższe pasują najpierw
  const sorted = [...mappings].sort((a, b) => b.keyword.length - a.keyword.length);
  for (const m of sorted) {
    if (lower.includes(m.keyword)) return m.category_id;
  }
  return null;
}

/**
 * Oznacza każdy line-item flagami:
 *  - is_promo: EAN produktu pokrywa się z aktywną promocją w dniu zamówienia
 *  - is_new_product: zamówienie złożono w ciągu 90 dni od dodania produktu do katalogu
 *  - price_category_id: kategoria cenowa wyznaczona ze słownika category_mapping
 *  - price_at_purchase: cena z matrycy price_history dla danej kategorii i daty
 *
 * Promotions matching: product_list to tekst z EAN-ami (oddzielone przecinkiem/spacją/newline).
 * Nowość produktu: products.created_at to najbliższe przybliżenie daty premiery.
 */
export async function assignPromoAndNewProduct(lineItems, supabase) {
  // Pobierz promocje, słownik kategorii i matrycę cen równolegle
  const [promosResult, mappingsResult, priceHistoryResult] = await Promise.all([
    supabase
      .from("promotions")
      .select("id, start_date, end_date, product_list")
      .not("start_date", "is", null)
      .not("end_date", "is", null),
    supabase
      .from("category_mapping")
      .select("keyword, category_id"),
    supabase
      .from("price_history")
      .select("category_id, date_from, date_to, avg_price"),
  ]);

  if (promosResult.error) throw new Error(`promotions fetch error: ${promosResult.error.message}`);
  if (mappingsResult.error) throw new Error(`category_mapping fetch error: ${mappingsResult.error.message}`);
  if (priceHistoryResult.error) throw new Error(`price_history fetch error: ${priceHistoryResult.error.message}`);

  const promotionList  = promosResult.data     ?? [];
  const categoryMappings = mappingsResult.data  ?? [];
  const priceHistory   = priceHistoryResult.data ?? [];

  const NEW_PRODUCT_DAYS = 90;

  return lineItems.map((li) => {
    // is_promo: EAN w product_list aktywnej promocji w dniu zamówienia
    let is_promo = false;
    if (li.ean && li.date && promotionList.length > 0) {
      const orderDate = li.date.slice(0, 10); // YYYY-MM-DD
      const eanStr = String(li.ean);
      is_promo = promotionList.some((promo) => {
        if (orderDate < promo.start_date || orderDate > promo.end_date) return false;
        if (!promo.product_list) return false;
        return promo.product_list.includes(eanStr);
      });
    }

    // is_new_product: zamówienie w ciągu 90 dni od products.created_at
    let is_new_product = false;
    if (li.product_created_at && li.date) {
      const diffDays =
        (new Date(li.date).getTime() - new Date(li.product_created_at).getTime()) /
        (86400 * 1000);
      is_new_product = diffDays >= 0 && diffDays <= NEW_PRODUCT_DAYS;
    }

    // price_category_id: kategoria z słownika mapowania
    const price_category_id = li.product_name
      ? getCategoryFromProductName(li.product_name, categoryMappings)
      : null;

    // price_at_purchase: cena z matrycy dla danej kategorii i daty zamówienia
    let price_at_purchase = null;
    if (price_category_id && li.date && priceHistory.length > 0) {
      const orderDate = li.date.slice(0, 10);
      const match = priceHistory.find((ph) => {
        if (ph.category_id !== price_category_id) return false;
        if (orderDate < ph.date_from) return false;
        if (ph.date_to && orderDate > ph.date_to) return false;
        return true;
      });
      if (match) price_at_purchase = match.avg_price;
    }

    return { ...li, is_promo, is_new_product, price_category_id, price_at_purchase };
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
 * Przelicza LTV dla wszystkich klientów przez SQL RPC — bez fetch do endpointu.
 */
async function recalculateLTV(supabase) {
  const { error } = await supabase.rpc("recalculate_all_ltv");
  if (error) throw new Error("recalculateLTV failed: " + error.message);
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

  // Fetch existing records for merge (first_order, last_order, orders_count)
  const existingMap = new Map();
  for (let i = 0; i < clientRows.length; i += UPSERT_BATCH) {
    const batchIds = clientRows.slice(i, i + UPSERT_BATCH).map(r => r.client_id);
    const { data } = await supabase
      .from('clients_360')
      .select('client_id, first_order, last_order, orders_count')
      .in('client_id', batchIds);
    for (const row of data ?? []) existingMap.set(row.client_id, row);
  }

  // Merge first_order/last_order/orders_count for existing clients
  const mergedClientRows = clientRows.map(r => {
    const existing = existingMap.get(r.client_id);
    if (!existing) return r;

    const firstOrder = [existing.first_order, r.first_order].filter(Boolean).sort()[0] ?? r.first_order;
    const lastOrder = [existing.last_order, r.last_order].filter(Boolean).sort().reverse()[0] ?? r.last_order;
    const ordersCount = (existing.orders_count ?? 0) + (r.orders_count ?? 0);

    return { ...r, first_order: firstOrder, last_order: lastOrder, orders_count: ordersCount };
  });

  await batchUpsert(supabase, "clients_360", mergedClientRows, "client_id");

  // — client_product_events ───────────────────────────────────────────────────
  // Wstawiamy tylko linie z product_name (pomijamy wiersze-sumy bez produktu)
  const eventRows = lineItems
    .filter((li) => li.client_id && li.product_name && li.date)
    .map((li) => ({
      order_id: li.order_id ?? null,
      order_sum: li.sum ?? null,
      client_id: li.client_id,
      ean: li.ean ?? null,
      product_name: li.product_name,
      order_date: new Date(li.date).toISOString(),
      quantity: li.qty ?? 1,
      line_total: li.price ?? 0,
      season: li.occasion ?? null,
      is_promo: li.is_promo ?? false,
      is_new_product: li.is_new_product ?? false,
      price_category_id: li.price_category_id ?? null,
      price_at_purchase: li.price_at_purchase ?? null,
    }));

  for (let i = 0; i < eventRows.length; i += UPSERT_BATCH) {
    const batch = eventRows.slice(i, i + UPSERT_BATCH);
    const { error } = await supabase
      .from("client_product_events")
      .upsert(batch, { onConflict: 'order_id,ean,product_name', ignoreDuplicates: true });
    if (error) throw new Error(`upsert client_product_events error: ${error.message}`);
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

// ─── runSanityChecks ──────────────────────────────────────────────────────────

/**
 * Uruchamia zestaw kontrolnych sprawdzeń jakości danych po ETL.
 * Nigdy nie rzuca wyjątku — zapisuje wyniki do sync_log.
 */
export async function runSanityChecks(supabase, _runStats) {
  const checkResults = [];
  let overallStatus = 'success';

  // Helper to mark overall status
  function flagStatus(s) {
    if (s === 'danger') overallStatus = 'danger';
    else if (s === 'warning' && overallStatus !== 'danger') overallStatus = 'warning';
  }

  // 1. LTV CONSISTENCY
  try {
    const PAGE = 1000;

    // Fetch all ltv from clients_360
    let ltvSum360 = 0;
    let from360 = 0;
    while (true) {
      const { data, error } = await supabase.from('clients_360').select('ltv').range(from360, from360 + PAGE - 1);
      if (error) throw new Error(error.message);
      if (!data?.length) break;
      for (const r of data) ltvSum360 += (parseFloat(r.ltv) || 0);
      if (data.length < PAGE) break;
      from360 += PAGE;
    }

    // Fetch all line_total from client_product_events
    let ltvSumEvents = 0;
    let fromEv = 0;
    while (true) {
      const { data, error } = await supabase.from('client_product_events').select('line_total').range(fromEv, fromEv + PAGE - 1);
      if (error) throw new Error(error.message);
      if (!data?.length) break;
      for (const r of data) ltvSumEvents += (parseFloat(r.line_total) || 0);
      if (data.length < PAGE) break;
      fromEv += PAGE;
    }

    const diffPct = ltvSum360 > 0 ? Math.abs(ltvSum360 - ltvSumEvents) / ltvSum360 * 100 : 0;
    let status = 'ok';
    if (diffPct > 5) {
      status = 'danger';
      flagStatus('danger');
      // Auto-fix: recalculate all LTV
      try {
        await recalculateAllLTV(supabase);
        console.log('[sanity] AUTO-FIXED: LTV recalculated');
      } catch (fixErr) {
        console.error('[sanity] LTV recalculate failed:', fixErr?.message);
      }
    } else if (diffPct > 1) {
      status = 'warning';
      flagStatus('warning');
    }

    checkResults.push({
      name: 'ltv_consistency',
      status,
      message: `LTV clients_360: ${Math.round(ltvSum360 * 100) / 100}, LTV events: ${Math.round(ltvSumEvents * 100) / 100}, diff: ${diffPct.toFixed(2)}%`,
      value: diffPct,
    });
  } catch (err) {
    checkResults.push({ name: 'ltv_consistency', status: 'error', message: err?.message });
  }

  // 2. ORPHAN CLIENTS
  try {
    const PAGE = 1000;
    let allClientIds = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase.from('clients_360').select('client_id').range(from, from + PAGE - 1);
      if (error) throw new Error(error.message);
      if (!data?.length) break;
      allClientIds.push(...data.map(r => r.client_id));
      if (data.length < PAGE) break;
      from += PAGE;
    }

    let clientIdsWithEvents = new Set();
    let fromEv = 0;
    while (true) {
      const { data, error } = await supabase.from('client_product_events').select('client_id').range(fromEv, fromEv + PAGE - 1);
      if (error) throw new Error(error.message);
      if (!data?.length) break;
      for (const r of data) if (r.client_id) clientIdsWithEvents.add(r.client_id);
      if (data.length < PAGE) break;
      fromEv += PAGE;
    }

    const orphans = allClientIds.filter(id => !clientIdsWithEvents.has(id)).length;
    if (orphans > 0) flagStatus('warning');

    checkResults.push({
      name: 'orphan_clients',
      status: orphans > 0 ? 'warning' : 'ok',
      message: `${orphans} klientów bez żadnych eventów`,
      value: orphans,
    });
  } catch (err) {
    checkResults.push({ name: 'orphan_clients', status: 'error', message: err?.message });
  }

  // 3. DUPLICATE EVENTS
  try {
    const PAGE = 1000;
    let allEvents = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase.from('client_product_events').select('client_id, ean, order_date').range(from, from + PAGE - 1);
      if (error) throw new Error(error.message);
      if (!data?.length) break;
      allEvents = allEvents.concat(data);
      if (data.length < PAGE) break;
      from += PAGE;
    }

    const groupMap = {};
    for (const ev of allEvents) {
      const dateKey = ev.order_date ? ev.order_date.slice(0, 10) : 'null';
      const key = `${ev.client_id}||${ev.ean ?? ''}||${dateKey}`;
      groupMap[key] = (groupMap[key] ?? 0) + 1;
    }
    const dupeGroups = Object.values(groupMap).filter(c => c > 1).length;
    const total = allEvents.length;
    const dupePct = total > 0 ? (dupeGroups / total) * 100 : 0;

    let status = 'ok';
    if (dupePct > 1) {
      status = 'warning';
      flagStatus('warning');
    }

    checkResults.push({
      name: 'duplicate_events',
      status,
      message: `${dupeGroups} grup duplikatów (${dupePct.toFixed(2)}% eventów)`,
      value: dupeGroups,
    });
  } catch (err) {
    checkResults.push({ name: 'duplicate_events', status: 'error', message: err?.message });
  }

  // 4. NULL EAN RATE (last 30 days)
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400 * 1000).toISOString();

    const { count: totalRecent } = await supabase
      .from('client_product_events')
      .select('*', { count: 'exact', head: true })
      .gte('order_date', thirtyDaysAgo);

    const { count: nullEanRecent } = await supabase
      .from('client_product_events')
      .select('*', { count: 'exact', head: true })
      .gte('order_date', thirtyDaysAgo)
      .is('ean', null);

    const nullPct = (totalRecent ?? 0) > 0 ? ((nullEanRecent ?? 0) / (totalRecent ?? 1)) * 100 : 0;

    let status = 'ok';
    if (nullPct > 20) {
      status = 'danger';
      flagStatus('danger');
    }

    checkResults.push({
      name: 'null_ean_rate',
      status,
      message: `Null EAN (ostatnie 30 dni): ${nullEanRecent ?? 0}/${totalRecent ?? 0} (${nullPct.toFixed(1)}%)`,
      value: nullPct,
    });
  } catch (err) {
    checkResults.push({ name: 'null_ean_rate', status: 'error', message: err?.message });
  }

  // 5. SEGMENT SANITY
  try {
    const { count: totalClients } = await supabase
      .from('clients_360')
      .select('*', { count: 'exact', head: true });

    const { count: diamondCount } = await supabase
      .from('clients_360')
      .select('*', { count: 'exact', head: true })
      .eq('legacy_segment', 'Diamond');

    const diamondPct = (totalClients ?? 0) > 0 ? ((diamondCount ?? 0) / (totalClients ?? 1)) * 100 : 0;

    let status = 'ok';
    if (diamondPct > 5) {
      status = 'warning';
      flagStatus('warning');
    }

    checkResults.push({
      name: 'segment_sanity',
      status,
      message: `Diamond: ${diamondCount ?? 0}/${totalClients ?? 0} (${diamondPct.toFixed(1)}%)`,
      value: diamondPct,
    });
  } catch (err) {
    checkResults.push({ name: 'segment_sanity', status: 'error', message: err?.message });
  }

  // 6. FIRST ORDER DATE (first_order > last_order)
  try {
    const PAGE = 1000;
    let allClients = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('clients_360')
        .select('client_id, first_order, last_order')
        .not('first_order', 'is', null)
        .not('last_order', 'is', null)
        .range(from, from + PAGE - 1);
      if (error) throw new Error(error.message);
      if (!data?.length) break;
      allClients = allClients.concat(data);
      if (data.length < PAGE) break;
      from += PAGE;
    }

    const badClients = allClients.filter(r => r.first_order > r.last_order);

    if (badClients.length > 0) {
      // Fix: set first_order = last_order for each bad client
      const BATCH = 200;
      for (let i = 0; i < badClients.length; i += BATCH) {
        const batch = badClients.slice(i, i + BATCH).map(c => ({
          client_id: c.client_id,
          first_order: c.last_order,
          updated_at: new Date().toISOString(),
        }));
        await supabase.from('clients_360').upsert(batch, { onConflict: 'client_id', ignoreDuplicates: false });
      }
      console.log(`[sanity] Fixed ${badClients.length} clients with first_order > last_order`);
      flagStatus('warning');
    }

    checkResults.push({
      name: 'first_order_date',
      status: badClients.length > 0 ? 'warning' : 'ok',
      message: `${badClients.length} klientów z first_order > last_order (naprawiono)`,
      value: badClients.length,
    });
  } catch (err) {
    checkResults.push({ name: 'first_order_date', status: 'error', message: err?.message });
  }

  // Save results to sync_log
  try {
    await supabase.from('sync_log').insert({
      source: 'csv_upload',
      status: overallStatus === 'danger' ? 'error' : 'success',
      rows_upserted: 0,
      meta: { sanity_checks: checkResults, type: 'sanity_check' },
    });
  } catch (logErr) {
    console.error('[sanity] sync_log insert failed:', logErr?.message);
  }

  return { status: overallStatus, checks: checkResults };
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

  // Krok 3.5
  let withPromoFlags;
  try {
    withPromoFlags = await assignPromoAndNewProduct(withTaxonomy, supabase);
    console.log(`[ETL step 3.5] assignPromoAndNewProduct OK`);
  } catch (err) {
    console.error("[ETL step 3.5] assignPromoAndNewProduct FAILED:", err?.message, err?.stack);
    throw err;
  }

  // Krok 4
  let withOccasions;
  try {
    withOccasions = assignOccasion(withPromoFlags);
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

  // Krok 9: kontrole jakości danych
  try {
    await runSanityChecks(supabase, result);
    console.log("[ETL step 9] runSanityChecks OK");
  } catch (err) {
    console.error("[ETL step 9] runSanityChecks FAILED:", err?.message);
    // non-fatal
  }

  return {
    processed: lineItems.length,
    unmapped,
    ...result,
  };
}

// ─── recalculateAllLTV ────────────────────────────────────────────────────────

/**
 * Jednorazowe przeliczenie LTV dla wszystkich klientów z client_product_events.
 * Stronicuje po 1000 klientów. Zwraca { updated, total_ltv }.
 */
export async function recalculateAllLTV(supabase) {
  const PAGE = 1000;
  let allClientIds = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("clients_360")
      .select("client_id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`recalculateAllLTV fetch clients error: ${error.message}`);
    if (!data?.length) break;
    allClientIds.push(...data.map((r) => r.client_id));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  let updated = 0;
  let total_ltv = 0;

  for (let i = 0; i < allClientIds.length; i += PAGE) {
    const batch = allClientIds.slice(i, i + PAGE);

    const { data: events, error: evErr } = await supabase
      .from("client_product_events")
      .select("client_id, line_total")
      .in("client_id", batch);
    if (evErr) throw new Error(`recalculateAllLTV fetch events error: ${evErr.message}`);

    const ltvMap = {};
    for (const id of batch) ltvMap[id] = 0;
    for (const row of events ?? []) {
      ltvMap[row.client_id] = (ltvMap[row.client_id] ?? 0) + (row.line_total ?? 0);
    }

    const updates = Object.entries(ltvMap).map(([client_id, ltv]) => ({
      client_id,
      ltv: Math.min(Math.round(ltv * 100) / 100, 9999999.99),
      updated_at: new Date().toISOString(),
    }));

    for (let j = 0; j < updates.length; j += UPSERT_BATCH) {
      const b = updates.slice(j, j + UPSERT_BATCH);
      const { error: upErr } = await supabase
        .from("clients_360")
        .upsert(b, { onConflict: "client_id", ignoreDuplicates: false });
      if (upErr) throw new Error(`recalculateAllLTV upsert error: ${upErr.message}`);
    }

    updated += updates.length;
    total_ltv += updates.reduce((s, r) => s + r.ltv, 0);
  }

  return { updated, total_ltv: Math.round(total_ltv * 100) / 100 };
}
