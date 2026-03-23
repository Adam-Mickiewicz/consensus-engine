#!/usr/bin/env node
// scripts/shoper-historical-import.js
// Import historyczny zamówień 2017-2021 z Shoper API do Supabase.
// NIE czyści bazy — dopisuje do istniejących danych 2022-2026.
//
// Uruchomienie:
//   node scripts/shoper-historical-import.js
//
// Restart od zera:
//   rm -f scripts/historical-checkpoint.json && node scripts/shoper-historical-import.js

require("dotenv").config({ path: require("path").join(__dirname, "../.env.local") });

const fs   = require("fs");
const path = require("path");
const { createHash } = require("crypto");
const { createClient } = require("@supabase/supabase-js");

// ─── Konfiguracja ─────────────────────────────────────────────────────────────

const SHOP_URL    = (process.env.SHOPER_URL ?? "https://nadwyraz.com").replace(/\/$/, "");
const API_TOKEN   = process.env.SHOPER_API_TOKEN ?? process.env.SHOPER_CLIENT_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const CHECKPOINT_FILE = path.join(__dirname, "historical-checkpoint.json");
const LOG_FILE        = path.join(__dirname, "import.log");
const IMPORT_FROM     = "2017-01";
const IMPORT_TO       = "2021-12";
const CONCURRENCY     = 4;
const BATCH_DELAY_MS  = 500;
const RETRY_ATTEMPTS  = 3;
const RETRY_DELAY_MS  = 1000;
const RATE_LIMIT_DELAY_MS = 5000;

const HEADERS = { Authorization: `Bearer ${API_TOKEN}`, Accept: "application/json" };

// ─── Log do pliku ─────────────────────────────────────────────────────────────

const logStream = fs.createWriteStream(LOG_FILE, { flags: "a" });

function log(...args) {
  const msg = args.join(" ");
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  logStream.write(line);
}

function logErr(...args) {
  const msg = args.join(" ");
  const line = `[${new Date().toISOString()}] ❌ ${msg}\n`;
  process.stderr.write(line);
  logStream.write(line);
}

// ─── Env check ────────────────────────────────────────────────────────────────

function checkEnv() {
  const missing = [];
  if (!API_TOKEN)    missing.push("SHOPER_API_TOKEN (lub SHOPER_CLIENT_SECRET)");
  if (!SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!SUPABASE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length) {
    logErr("Brakujące zmienne środowiskowe:", missing.join(", "));
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

// ─── Miesiące ────────────────────────────────────────────────────────────────

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

// ─── Retry ───────────────────────────────────────────────────────────────────

async function withRetry(fn, label) {
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const is429 = err.message?.includes("429") || err.message?.includes("requests limit");
      const delay = is429 ? RATE_LIMIT_DELAY_MS : RETRY_DELAY_MS;
      if (attempt < RETRY_ATTEMPTS) {
        log(`  ⚠ ${label} — próba ${attempt}/${RETRY_ATTEMPTS}, retry za ${delay}ms: ${err.message}`);
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

// ─── Shoper: paginacja zamówień ───────────────────────────────────────────────
// Dane z lat 2017-2021 są na początku (sort[date]=ASC) — zaczynamy od strony 1.

let _nextStartPage = 1; // carry-over między miesiącami; dla 2017-01 startujemy od 1

async function fetchOrdersForMonth(month) {
  const [year, mon] = month.split("-");
  const lastDay  = new Date(Number(year), Number(mon), 0).getDate();
  const dateFrom = `${month}-01`;
  const dateTo   = `${month}-${String(lastDay).padStart(2, "0")}`;

  const startPage = _nextStartPage;
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
      const orderDate = (order.date ?? "").slice(0, 10);
      if (orderDate > dateTo) { pastEnd = true; break; }
      if (orderDate >= dateFrom) allOrders.push(order);
    }

    if (pastEnd) { _nextStartPage = page; break; }

    const count = Number(data.count ?? 0);
    if (page * 50 >= count) { _nextStartPage = page; break; }
    page++;
  }

  return allOrders;
}

// ─── Shoper: produkty do zamówień ────────────────────────────────────────────

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

// ─── Normalizacja ─────────────────────────────────────────────────────────────

function normalizeOrder(order, productsMap) {
  const rawProducts = productsMap?.get(String(order.order_id)) ?? [];
  const products = rawProducts.map((p) => ({
    name:         p.name      ?? "",
    qty:          Number(p.quantity ?? 1),
    price:        parseFloat(p.price ?? 0),
    product_code: p.code      ?? "",
  }));

  return {
    order_id: String(order.order_id ?? order.id ?? ""),
    email:    (order.email ?? order.client_email ?? "").toLowerCase().trim(),
    date:     (order.add_date ?? order.date_add ?? order.date ?? order.created_at ?? "").slice(0, 10),
    sum:      parseFloat(order.total_price ?? order.total ?? order.sum ?? 0),
    products,
    // Przechowaj oryginalne pola imię/nazwisko do zapisu w vault
    _first_name: (order.client_firstname ?? order.billing_firstname ?? "").trim(),
    _last_name:  (order.client_lastname  ?? order.billing_lastname  ?? "").trim()
      || (() => {
        // Fallback: parsuj order.name jako "Imię Nazwisko"
        const name = (order.client_name ?? order.name ?? "").trim();
        const parts = name.split(/\s+/);
        if (parts.length >= 2) {
          return parts.slice(1).join(" ");
        }
        return "";
      })(),
  };
}

// ─── Uzupełnij imię/nazwisko w master_key ─────────────────────────────────────

async function updateNamesInVault(rawOrders, supabase, encryptFn) {
  // Zbuduj mapę email_hash → { first, last }
  const nameMap = new Map();

  for (const order of rawOrders) {
    const email = (order.email ?? order.client_email ?? "").toLowerCase().trim();
    if (!email) continue;
    if (nameMap.has(email)) continue; // pierwszy zapis wygrywa

    // Preferuj oddzielne pola, fallback na order.name
    let first = (order.client_firstname ?? order.billing_firstname ?? "").trim();
    let last  = (order.client_lastname  ?? order.billing_lastname  ?? "").trim();

    if (!first) {
      const fullName = (order.client_name ?? order.name ?? "").trim();
      if (fullName) {
        const parts = fullName.split(/\s+/);
        first = parts[0] ?? "";
        last  = parts.slice(1).join(" ");
      }
    }

    if (first) {
      nameMap.set(email, { first, last });
    }
  }

  if (nameMap.size === 0) return;

  // Zaktualizuj master_key gdzie first_name_encrypted IS NULL
  let updated = 0;
  for (const [email, { first, last }] of nameMap) {
    const hash = createHash("md5").update(email).digest("hex");
    const { error } = await supabase
      .from("master_key")
      .update({
        first_name_encrypted: encryptFn(first),
        last_name_encrypted:  last ? encryptFn(last) : null,
      })
      .eq("email_hash", hash)
      .is("first_name_encrypted", null); // nie nadpisuj istniejących danych
    if (!error) updated++;
  }

  log(`  Zaktualizowano imiona/nazwiska w master_key: ${updated}/${nameMap.size}`);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  checkEnv();

  log("=== Import historyczny 2017-2021 — start ===");

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

  // Dynamiczny import modułów ESM
  const { runETLPipeline } = await import("../lib/crm/etl.js");
  const { encrypt }        = await import("../lib/crypto/pii.js");

  const checkpoint = loadCheckpoint();
  const allMonths  = monthsInRange(IMPORT_FROM, IMPORT_TO);

  if (checkpoint.lastCompleted) {
    log(`Checkpoint: wznawiamy po miesiącu ${checkpoint.lastCompleted}`);
  }

  const months = checkpoint.lastCompleted
    ? allMonths.filter((m) => m > checkpoint.lastCompleted)
    : allMonths;

  if (months.length === 0) {
    log("Import historyczny już zakończony (checkpoint = 2021-12)");
    logStream.end();
    return;
  }

  log(`Plan: ${months.length} miesięcy (${months[0]} → ${months[months.length - 1]})\n`);

  let totalOrders  = 0;
  let totalClients = 0;

  for (const month of months) {
    try {
      log(`[${month}] Pobieram zamówienia...`);
      const rawOrders = await fetchOrdersForMonth(month);

      if (rawOrders.length === 0) {
        log(`[${month}] ⏭  0 zamówień — pomijam`);
        saveCheckpoint(month);
        continue;
      }

      // Pobierz produkty
      const orderIds    = rawOrders.map((o) => String(o.order_id));
      const productsMap = await fetchProductsForOrders(orderIds);

      // Normalizacja (z _first_name / _last_name)
      const normalized = rawOrders
        .map((o) => normalizeOrder(o, productsMap))
        .filter((o) => o.order_id && o.email && o.date);

      if (normalized.length === 0) {
        log(`[${month}] ⏭  0 prawidłowych zamówień po filtracji`);
        saveCheckpoint(month);
        continue;
      }

      // ETL (bez recalculateLTV — wywołamy raz na końcu)
      const result = await runETLPipeline(normalized, supabase, `historical-${month}`);

      // Odśwież widoki
      const { error: viewErr } = await supabase.rpc("refresh_crm_views");
      if (viewErr) logErr("rpc refresh_crm_views:", viewErr.message);

      // Zapisz imię/nazwisko w master_key
      await updateNamesInVault(rawOrders, supabase, encrypt);

      totalOrders  += rawOrders.length;
      totalClients += result.clients ?? 0;

      log(
        `[${month}] ✅ zamówień: ${rawOrders.length}, klientów: ${result.clients ?? "?"}, eventów: ${result.events ?? "?"}, niezmapowanych: ${result.unmapped ?? "?"}`
      );

      saveCheckpoint(month);

    } catch (err) {
      logErr(`[${month}] błąd: ${err.message}`);
      saveCheckpoint(month);
    }
  }

  // Przelicz LTV raz na końcu całego importu historycznego
  log("Przeliczam LTV dla całej bazy...");
  const { error: ltvErr } = await supabase.rpc("recalculate_all_ltv");
  if (ltvErr) logErr("LTV error:", ltvErr.message);
  else log("LTV przeliczone ✅");

  log("\n══════════════════════════════════════════════");
  log("  PODSUMOWANIE IMPORTU HISTORYCZNEGO 2017-2021");
  log("══════════════════════════════════════════════");
  log(`  Zamówień przetworzonych: ${totalOrders}`);
  log(`  Klientów zaktualizowanych: ${totalClients}`);
  log("══════════════════════════════════════════════\n");

  logStream.end();
}

main().catch((err) => {
  logErr("Nieoczekiwany błąd:", err.message);
  if (err.stack) logErr(err.stack);
  logStream.end();
  process.exit(1);
});
