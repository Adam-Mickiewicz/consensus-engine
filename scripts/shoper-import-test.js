#!/usr/bin/env node
// scripts/shoper-import-test.js
// Test importu 2 stron zamówień z Shoper API przez pełny ETL pipeline.
// Uruchom: node scripts/shoper-import-test.js

require("dotenv").config({ path: require("path").join(__dirname, "../.env.local") });

const { createClient } = require("@supabase/supabase-js");

const SHOP_URL    = process.env.SHOPER_URL           ?? "https://nadwyraz.com";
// Shoper używa statycznego API token jako Bearer — nie ma potrzeby flow OAuth.
// Token przechowujemy w SHOPER_API_TOKEN (lub fallback: SHOPER_CLIENT_SECRET).
const API_TOKEN   = process.env.SHOPER_API_TOKEN ?? process.env.SHOPER_CLIENT_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function checkEnv() {
  const missing = [];
  if (!API_TOKEN)    missing.push("SHOPER_API_TOKEN (lub SHOPER_CLIENT_SECRET)");
  if (!SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!SUPABASE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length) {
    console.error("❌ Brakujące zmienne środowiskowe:", missing.join(", "));
    process.exit(1);
  }
}

// ─── Fetch jednej strony zamówień ─────────────────────────────────────────

async function fetchPage(token, page) {
  const base = SHOP_URL.replace(/\/$/, "");
  const params = new URLSearchParams({
    limit: "50",
    page: String(page),
    "sort[date_add]": "DESC",
  });

  const res = await fetch(`${base}/webapi/rest/orders?${params}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Shoper orders page ${page} failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const json = await res.json();
  return json.list ?? json.data ?? [];
}

// ─── Fetch produktów dla listy order_id ───────────────────────────────────
// Shoper API nie obsługuje multi-value filtra na order_id (przecinki biorą
// tylko pierwszy ID, bracket-index ignoruje filtr całkowicie, bulk API to
// płatny moduł). Jedyna działająca metoda: osobny request per order_id,
// uruchamiany równolegle w batchach po CONCURRENCY.

async function fetchProductsForOrders(token, orderIds) {
  const base = SHOP_URL.replace(/\/$/, "");
  const CONCURRENCY = 8; // Shoper rate limit: 10 req/s — zostawiamy margines
  const BATCH_DELAY_MS = 200;
  const productsByOrderId = new Map();

  for (let i = 0; i < orderIds.length; i += CONCURRENCY) {
    const batch = orderIds.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (id) => {
        const res = await fetch(
          `${base}/webapi/rest/order-products?filters[order_id]=${id}&limit=50`,
          { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
        );
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(`order-products for ${id} failed (${res.status}): ${body.slice(0, 200)}`);
        }
        const json = await res.json();
        return { id, items: json.list ?? [] };
      })
    );

    for (const { id, items } of results) {
      if (items.length > 0) productsByOrderId.set(String(id), items);
    }

    if (i + CONCURRENCY < orderIds.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  return productsByOrderId;
}

// ─── Normalizacja zamówienia do formatu ETL ────────────────────────────────
// Nazwy produktów w Supabase zawierają pełną nazwę z wariantem koloru/typu
// (np. "KOŁDRIAN / koszulka damska / biała"), więc używamy pełnej nazwy z API.
// EAN w Supabase to 13-cyfrowy barcode — pole code z Shopera (np. "23") to
// wewnętrzny kod produktu, nie EAN.

function normalizeOrder(order, productsMap) {
  const rawProducts = productsMap?.get(String(order.order_id)) ?? [];
  const products = rawProducts.map((p) => ({
    name:         p.name ?? "",           // pełna nazwa z wariantem — pasuje do products.name w Supabase
    qty:          Number(p.quantity ?? 1),
    price:        parseFloat(p.price ?? 0),
    product_code: p.code ?? "",           // wewnętrzny kod Shopera (np. "23", "9-3")
  }));

  return {
    order_id: String(order.order_id ?? order.id ?? ""),
    email:    (order.email ?? order.client_email ?? "").toLowerCase().trim(),
    date:     (order.add_date ?? order.date_add ?? order.date ?? order.created_at ?? "").slice(0, 10),
    sum:      parseFloat(order.total_price ?? order.total ?? order.sum ?? 0),
    products,
  };
}

// ─── MAIN ──────────────────────────────────────────────────────────────────

async function main() {
  checkEnv();

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });

  // 1. Token
  console.log("\n[1/5] Używam API token (Bearer)...");
  const token = API_TOKEN;
  console.log("      Token OK ✓");

  // 2. 2 strony zamówień
  console.log("\n[2/5] Pobieram strony 1 i 2 (limit=50 każda)...");
  const [page1, page2] = await Promise.all([
    fetchPage(token, 1),
    fetchPage(token, 2),
  ]);
  const rawOrders = [...page1, ...page2];
  console.log(`      Pobrano ${rawOrders.length} surowych zamówień (strona 1: ${page1.length}, strona 2: ${page2.length})`);

  // 3. Produkty z /order-products (osobny endpoint, batche po 25 order_id)
  console.log("\n[3/5] Pobieram produkty (batche po 25 order_id)...");
  const orderIds = rawOrders.map((o) => String(o.order_id));
  const productsMap = await fetchProductsForOrders(token, orderIds);
  const totalProducts = [...productsMap.values()].reduce((s, arr) => s + arr.length, 0);
  console.log(`      Pobrano ${totalProducts} produktów dla ${productsMap.size} zamówień`);

  // 4. Normalizacja + ETL
  console.log("\n[4/5] Normalizuję i przepuszczam przez ETL pipeline...");
  const normalized = rawOrders
    .map((o) => normalizeOrder(o, productsMap))
    .filter((o) => o.order_id && o.email && o.date);

  console.log(`      Zamówień po filtracji: ${normalized.length}`);

  // Przykładowe produkty z pierwszego zamówienia z produktami
  const sampleOrder = normalized.find((o) => o.products.length > 0);
  if (sampleOrder) {
    console.log(`\n      Przykładowe produkty (order ${sampleOrder.order_id}):`);
    console.log(JSON.stringify(sampleOrder.products.slice(0, 3), null, 2));
  } else {
    console.log("      ⚠  Żadne zamówienie nie ma produktów");
  }

  if (normalized.length === 0) {
    console.error("❌ Brak prawidłowych zamówień do przetworzenia");
    process.exit(1);
  }

  // Dynamiczny import ESM (lib/crm/etl.js używa ES modules)
  const { runETLPipeline } = await import("../lib/crm/etl.js");

  const result = await runETLPipeline(normalized, supabase, "shoper-test-script");

  // 5. Podsumowanie
  console.log("\n[5/6] ── PODSUMOWANIE ────────────────────────────────");
  console.log(`      Zamówień pobranych:  ${rawOrders.length}`);
  console.log(`      Line-itemów w ETL:   ${result.processed ?? "?"}`);
  console.log(`      Klientów zapisanych: ${result.clients   ?? "?"}`);
  console.log(`      Eventów zapisanych:  ${result.events    ?? "?"}`);
  console.log(`      Niezmapowanych:      ${result.unmapped  ?? "?"}`);

  // Pobierz przykładowy client_id z DB
  const { data: sample } = await supabase
    .from("clients_360")
    .select("client_id, ltv, legacy_segment")
    .order("updated_at", { ascending: false })
    .limit(3);

  if (sample?.length) {
    console.log("\n      Przykładowi klienci (ostatnio zaktualizowani):");
    for (const c of sample) {
      console.log(`        ${c.client_id}  LTV=${c.ltv}  segment=${c.legacy_segment}`);
    }
  }

  console.log("\n[6/6] ✅ GOTOWE — sprawdź /crm/clients w panelu\n");
}

main().catch((err) => {
  console.error("\n❌ Błąd:", err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
