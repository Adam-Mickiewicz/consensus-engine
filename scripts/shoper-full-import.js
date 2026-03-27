#!/usr/bin/env node
// scripts/shoper-full-import.js
// Pełny import historyczny zamówień z Shoper API do Supabase — miesiąc po miesiącu.
//
// Uruchomienie (z checkpointem):
//   node scripts/shoper-full-import.js
//
// Restart od zera:
//   rm -f scripts/import-checkpoint.json && node scripts/shoper-full-import.js

require("dotenv").config({ path: require("path").join(__dirname, "../.env.local") });

const fs   = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// ─── Konfiguracja ─────────────────────────────────────────────────────────────

const SHOP_URL    = (process.env.SHOPER_URL ?? "https://nadwyraz.com").replace(/\/$/, "");
const API_TOKEN   = process.env.SHOPER_API_TOKEN ?? process.env.SHOPER_CLIENT_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const CHECKPOINT_FILE = path.join(__dirname, "import-checkpoint.json");
const IMPORT_FROM     = "2017-11"; // włącznie
const IMPORT_TO       = "2026-03"; // włącznie
const CONCURRENCY     = 4;         // równoległe requesty po produkty (rate limit ~10 req/s)
const BATCH_DELAY_MS  = 500;       // przerwa między batchami produktów
const RETRY_ATTEMPTS  = 3;
const RETRY_DELAY_MS  = 1000;
const RATE_LIMIT_DELAY_MS = 5000;

const HEADERS = { Authorization: `Bearer ${API_TOKEN}`, Accept: "application/json" };

// ─── Env check ────────────────────────────────────────────────────────────────

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

// ─── Checkpoint ───────────────────────────────────────────────────────────────

function loadCheckpoint() {
  try {
    return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, "utf8"));
  } catch {
    return { lastCompleted: null };
  }
}

function saveCheckpoint(month) {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify({ lastCompleted: month }, null, 2));
}

// ─── Miesiące do przetworzenia ────────────────────────────────────────────────

function monthsInRange(from, to) {
  const months = [];
  let [y, m] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

// ─── Retry wrapper ────────────────────────────────────────────────────────────

async function withRetry(fn, label) {
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const is429 = err.message?.includes("429") || err.message?.includes("requests limit");
      const delay = is429 ? RATE_LIMIT_DELAY_MS : RETRY_DELAY_MS;
      if (attempt < RETRY_ATTEMPTS) {
        console.warn(`    ⚠ ${label} — próba ${attempt}/${RETRY_ATTEMPTS}, retry za ${delay}ms: ${err.message}`);
        await sleep(delay);
      } else {
        throw err;
      }
    }
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Shoper: zakres dat + binary search strony startowej ─────────────────────
// Shoper nie obsługuje filtrowania po dacie — używamy sort[date]=ASC i przerywamy
// paginację gdy zamówienia przekroczą dateTo. Filtrowanie client-side.
//
// Optymalizacja: binary search (~12 requestów = log2(4134)) wyznacza dokładną
// stronę startową dla pierwszego miesiąca. Kolejne miesiące startują od strony
// gdzie poprzedni miesiąc skończył (carry-over).

let _totalPages    = null; // pobierane raz przy pierwszym wywołaniu
let _nextStartPage = null; // carry-over między miesiącami

async function fetchOnePage(page) {
  const params = new URLSearchParams({ limit: "50", page: String(page), "sort[date]": "ASC" });
  return withRetry(async () => {
    const res = await fetch(`${SHOP_URL}/webapi/rest/orders?${params}`, { headers: HEADERS });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`orders page ${page} (${res.status}): ${body.slice(0, 200)}`);
    }
    return res.json();
  }, `orders page ${page} [binary search]`);
}

async function getTotalPages() {
  if (_totalPages !== null) return _totalPages;
  const first  = await fetchOnePage(1);
  _totalPages  = Number(first.pages ?? 1);
  const count  = Number(first.count ?? 0);
  const minDate = (first.list?.[0]?.date ?? "").slice(0, 10);
  console.log(`  API: ${_totalPages} stron, ${count} zamówień, najstarsze: ${minDate}`);
  return _totalPages;
}

// Binary search: znajdź pierwszą stronę gdzie firstDate >= targetDate.
// Zwraca max(1, wynik - 2) dla 2-stronicowego buforu.
async function findStartPage(targetDate, totalPages) {
  let low = 1, high = totalPages;
  let steps = 0;

  while (low < high) {
    const mid  = Math.floor((low + high) / 2);
    const data = await fetchOnePage(mid);
    const list = data.list ?? [];
    const firstDate = (list[0]?.date ?? "9999-12-31").slice(0, 10);
    steps++;
    console.log(`  [binary search] krok ${steps}: strona ${mid}/${totalPages} → ${firstDate} (low=${low}, high=${high})`);

    if (firstDate < targetDate) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  const result = Math.max(1, low - 2);
  console.log(`  Binary search: ${steps} kroków → strona startowa ${result}`);
  return result;
}

// ─── Shoper: pobierz wszystkie zamówienia z miesiąca ─────────────────────────

async function fetchOrdersForMonth(month) {
  const [year, mon] = month.split("-");
  const lastDay  = new Date(Number(year), Number(mon), 0).getDate();
  const dateFrom = `${month}-01`;
  const dateTo   = `${month}-${String(lastDay).padStart(2, "0")}`;

  // Wyznacz stronę startową — binary search przy pierwszym miesiącu,
  // carry-over z poprzedniego miesiąca dla kolejnych.
  let startPage;
  if (_nextStartPage !== null) {
    startPage = _nextStartPage;
  } else {
    const totalPages = await getTotalPages();
    startPage = await findStartPage(dateFrom, totalPages);
  }

  const allOrders = [];
  let page = startPage;

  while (true) {
    const params = new URLSearchParams({
      limit:        "50",
      page:         String(page),
      "sort[date]": "ASC",
    });

    const data = await withRetry(async () => {
      const res = await fetch(`${SHOP_URL}/webapi/rest/orders?${params}`, { headers: HEADERS });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`orders (${res.status}): ${body.slice(0, 200)}`);
      }
      return res.json();
    }, `orders page ${page} [${month}]`);

    const list = data.list ?? [];
    if (list.length === 0) { _nextStartPage = page; break; }

    let pastEnd = false;
    for (const order of list) {
      const orderDate = (order.date ?? "").slice(0, 10); // "YYYY-MM-DD"
      if (orderDate > dateTo) { pastEnd = true; break; }
      if (orderDate >= dateFrom) allOrders.push(order);
    }

    if (pastEnd) { _nextStartPage = page; break; } // kolejny miesiąc startuje z tej samej strony

    const count = Number(data.count ?? 0);
    if (page * 50 >= count) { _nextStartPage = page; break; }
    page++;
  }

  return allOrders;
}

// ─── Shoper: pobierz produkty dla listy order_id ─────────────────────────────
// Shoper nie obsługuje multi-value filtra — osobny request per order_id,
// 4 równoległe z opóźnieniem 500ms między batchami.

async function fetchProductsForOrders(orderIds) {
  const productsByOrderId = new Map();

  for (let i = 0; i < orderIds.length; i += CONCURRENCY) {
    const batch = orderIds.slice(i, i + CONCURRENCY);

    const results = await Promise.all(
      batch.map((id) =>
        withRetry(async () => {
          const res = await fetch(
            `${SHOP_URL}/webapi/rest/order-products?filters[order_id]=${id}&limit=50`,
            { headers: HEADERS }
          );
          if (!res.ok) {
            const body = await res.text().catch(() => "");
            throw new Error(`order-products ${id} (${res.status}): ${body.slice(0, 200)}`);
          }
          const json = await res.json();
          return { id, items: json.list ?? [] };
        }, `order-products ${id}`)
      )
    );

    for (const { id, items } of results) {
      if (items.length > 0) productsByOrderId.set(String(id), items);
    }

    if (i + CONCURRENCY < orderIds.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  return productsByOrderId;
}

// ─── Normalizacja zamówienia ──────────────────────────────────────────────────

function normalizeOrder(order, productsMap) {
  const rawProducts = productsMap?.get(String(order.order_id)) ?? [];
  const products = rawProducts.map((p) => ({
    name:         p.name ?? "",
    qty:          Number(p.quantity ?? 1),
    price:        parseFloat(p.price ?? 0),
    product_code: p.code ?? "",
  }));

  return {
    order_id:        String(order.order_id ?? order.id ?? ""),
    email:           (order.email ?? order.client_email ?? "").toLowerCase().trim(),
    date:            (order.add_date ?? order.date_add ?? order.date ?? order.created_at ?? "").slice(0, 10),
    sum:             parseFloat(order.total_price ?? order.total ?? order.sum ?? 0),
    promo_code:      order.promo_code || null,
    discount_code:   parseFloat(order.discount_code) || 0,
    discount_client: parseFloat(order.discount_client) || 0,
    shipping_cost:   parseFloat(order.shipping_cost) || 0,
    products,
  };
}

// ─── Wyczyść bazę ─────────────────────────────────────────────────────────────

async function clearDatabase(supabase) {
  console.log("Czyszczę bazę...");

  // Próba RPC truncate
  const { error: rpcErr } = await supabase.rpc("truncate_crm_tables");
  if (!rpcErr) {
    console.log("  truncate_crm_tables RPC OK");
    return;
  }

  // Fallback: delete per tabela — kolejność: najpierw duże tabele (ryzyko timeout),
  // client_product_events na końcu — żeby eventy przeżyły crash na clients_360.
  const { error: e2 } = await supabase.from("clients_360").delete().gte("client_id", "");
  if (e2) console.warn("  clients_360 delete:", e2.message);

  const { error: e3 } = await supabase.from("master_key").delete().gte("client_id", "");
  if (e3) console.warn("  master_key delete:", e3.message);

  const { error: e1 } = await supabase.from("client_product_events").delete().gte("id", 0);
  if (e1) console.warn("  client_product_events delete:", e1.message);

  // Weryfikacja
  const counts = {};
  for (const t of ["client_product_events", "clients_360", "master_key"]) {
    const { data } = await supabase.from(t).select("count");
    counts[t] = data?.[0]?.count ?? "?";
  }
  console.log("  Po czyszczeniu:", counts);
  const allZero = Object.values(counts).every((c) => String(c) === "0");
  if (!allZero) throw new Error("Baza nie jest pusta po czyszczeniu: " + JSON.stringify(counts));
  console.log("  Baza pusta ✓");
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  checkEnv();

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

  // Dynamiczny import ESM
  const { runETLPipeline } = await import("../lib/crm/etl.js");

  const checkpoint = loadCheckpoint();
  const allMonths  = monthsInRange(IMPORT_FROM, IMPORT_TO);

  // Jeśli brak checkpointu — wyczyść bazę
  // if (!checkpoint.lastCompleted) {
  //   await clearDatabase(supabase);
  // } else {
    console.log(`Checkpoint: wznawiamy po miesiącu ${checkpoint.lastCompleted}`);
  // }

  // Odfiltruj już przetworzone miesiące
  const months = checkpoint.lastCompleted
    ? allMonths.filter((m) => m > checkpoint.lastCompleted)
    : allMonths;

  console.log(`\nPlan: ${months.length} miesięcy (${months[0]} → ${months[months.length - 1]})\n`);

  // ── Totale ──
  let totalOrders  = 0;
  let totalClients = 0;
  let totalEvents  = 0;

  for (const month of months) {
    try {
      // 1. Zamówienia
      console.log(`[${month}] Pobieram zamówienia...`);
      const rawOrders = await fetchOrdersForMonth(month);

      if (rawOrders.length === 0) {
        console.log(`[${month}] ⏭  0 zamówień — pomijam`);
        saveCheckpoint(month);
        continue;
      }

      // 2. Produkty
      const orderIds   = rawOrders.map((o) => String(o.order_id));
      const productsMap = await fetchProductsForOrders(orderIds);

      // 3. Normalizacja
      const normalized = rawOrders
        .map((o) => normalizeOrder(o, productsMap))
        .filter((o) => o.order_id && o.email && o.date);

      if (normalized.length === 0) {
        console.log(`[${month}] ⏭  0 prawidłowych zamówień po filtracji`);
        saveCheckpoint(month);
        continue;
      }

      // 4. ETL
      const result = await runETLPipeline(normalized, supabase, `shoper-${month}`);

      // 5. Odśwież widoki (bez LTV — wywoływane raz na końcu)
      const { error: viewErr } = await supabase.rpc("refresh_crm_views");
      if (viewErr) console.error("rpc error:", viewErr.message);

      totalOrders  += rawOrders.length;
      totalClients += result.clients  ?? 0;
      totalEvents  += result.events   ?? 0;

      console.log(
        `[${month}] ✅ zamówień: ${rawOrders.length}, klientów: ${result.clients ?? "?"}, eventów: ${result.events ?? "?"}, niezmapowanych: ${result.unmapped ?? "?"}`
      );

      saveCheckpoint(month);

    } catch (err) {
      console.error(`[${month}] błąd: ${err.message}`);
      saveCheckpoint(month);
      // Kontynuuj do następnego miesiąca
    }
  }

  // ── Przelicz LTV raz na końcu całego importu ──
  console.log("Przeliczam LTV dla całej bazy...");
  const { error: ltvErr } = await supabase.rpc("recalculate_all_ltv");
  if (ltvErr) console.error("LTV error:", ltvErr.message);
  else console.log("LTV przeliczone ✅");

  // ── Uruchom import historyczny 2017-2021 w tle ──
  // console.log('\n=== Import 2022-2026 zakończony ===');
  // console.log('Startuje import historyczny 2017-2021...');
  // const { spawn } = require('child_process');
  // const historical = spawn('node', ['scripts/shoper-historical-import.js'], {
  //   detached: true,
  //   stdio: [
  //     'ignore',
  //     fs.openSync('scripts/import.log', 'a'),
  //     fs.openSync('scripts/import.log', 'a'),
  //   ],
  // });
  // historical.unref();
  // console.log('Import historyczny uruchomiony w tle (PID: ' + historical.pid + ')');

  // ── Podsumowanie ──
  const { data: ltvData } = await supabase.from("clients_360").select("count");
  const { data: evData }  = await supabase.from("client_product_events").select("count");
  const ltvClients = ltvData?.[0]?.count ?? "?";
  const evCount    = evData?.[0]?.count   ?? "?";

  // SUM(ltv) — paginate
  let sumLtv = 0;
  let from = 0;
  while (true) {
    const { data: rows } = await supabase.from("clients_360").select("ltv").range(from, from + 999);
    if (!rows?.length) break;
    for (const r of rows) sumLtv += parseFloat(r.ltv ?? 0);
    if (rows.length < 1000) break;
    from += 1000;
  }

  console.log("\n══════════════════════════════════════════════");
  console.log("  PODSUMOWANIE IMPORTU");
  console.log("══════════════════════════════════════════════");
  console.log(`  Zamówień przetworzonych: ${totalOrders}`);
  console.log(`  Klientów w bazie:        ${ltvClients}`);
  console.log(`  Eventów w bazie:         ${evCount}`);
  console.log(`  SUM(ltv):                ${sumLtv.toFixed(2)} PLN`);
  console.log("══════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("\n❌ Nieoczekiwany błąd:", err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
