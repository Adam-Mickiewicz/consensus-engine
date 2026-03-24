#!/usr/bin/env node
// scripts/shoper-pii-backfill.js
//
// Uzupełnia brakujące PII (email, imię, nazwisko) dla klientów zaimportowanych
// przed dodaniem szyfrowania (2022-2026).
//
// Strategia:
//   1. Pobiera z master_key wszystkie rekordy gdzie email_encrypted IS NULL
//   2. Dla każdego client_id znajduje jeden order_id z client_product_events
//   3. Pobiera zamówienie z Shoper API: GET /webapi/rest/orders/ORDER_ID
//   4. Wyciąga email + imię/nazwisko z pola delivery_address
//   5. Szyfruje przez lib/crypto/pii.js i aktualizuje master_key
//
// Uruchomienie:
//   node scripts/shoper-pii-backfill.js
//
// Restart od checkpointu:
//   rm -f scripts/pii-checkpoint.json && node scripts/shoper-pii-backfill.js

require("dotenv").config({ path: require("path").join(__dirname, "../.env.local") });

const fs   = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { createCipheriv, randomBytes } = require("crypto");

// ─── Konfiguracja ─────────────────────────────────────────────────────────────

const SHOP_URL     = (process.env.SHOPER_URL ?? "https://nadwyraz.com").replace(/\/$/, "");
const API_TOKEN    = process.env.SHOPER_API_TOKEN ?? process.env.SHOPER_CLIENT_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ENC_KEY_HEX  = process.env.ENCRYPTION_KEY ?? "";

const CHECKPOINT_FILE   = path.join(__dirname, "pii-checkpoint.json");
const CONCURRENCY       = 4;
const BATCH_DELAY_MS    = 300;
const RETRY_ATTEMPTS    = 3;
const RETRY_DELAY_MS    = 1000;
const RATE_LIMIT_MS     = 5000;
const LOG_INTERVAL      = 100;

const HEADERS = { Authorization: `Bearer ${API_TOKEN}`, Accept: "application/json" };

// ─── Env check ────────────────────────────────────────────────────────────────

function checkEnv() {
  const missing = [];
  if (!API_TOKEN)                        missing.push("SHOPER_API_TOKEN (lub SHOPER_CLIENT_SECRET)");
  if (!SUPABASE_URL)                     missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!SUPABASE_KEY)                     missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (ENC_KEY_HEX.length !== 64)         missing.push("ENCRYPTION_KEY (64-char hex)");
  if (missing.length) {
    console.error("❌ Brakujące zmienne środowiskowe:", missing.join(", "));
    process.exit(1);
  }
}

// ─── Szyfrowanie PII (AES-256-GCM) ───────────────────────────────────────────
// Reimplementacja z lib/crypto/pii.js (CommonJS, bez importu ESM)

const ENC_ALGO = "aes-256-gcm";

function encrypt(plaintext) {
  if (plaintext == null || plaintext === "") return null;
  const key    = Buffer.from(ENC_KEY_HEX, "hex");
  const iv     = randomBytes(12);
  const cipher = createCipheriv(ENC_ALGO, key, iv);
  const ct     = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const tag    = cipher.getAuthTag();
  return Buffer.from(JSON.stringify({
    iv:  iv.toString("base64"),
    tag: tag.toString("base64"),
    ct:  ct.toString("base64"),
  })).toString("base64");
}

// ─── Checkpoint ───────────────────────────────────────────────────────────────

function loadCheckpoint() {
  try {
    return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, "utf8"));
  } catch {
    return { lastClientId: null };
  }
}

function saveCheckpoint(clientId) {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify({ lastClientId: clientId }, null, 2));
}

// ─── Retry wrapper ────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetry(fn, label) {
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const is429 = err.message?.includes("429") || err.message?.includes("requests limit");
      const delay = is429 ? RATE_LIMIT_MS : RETRY_DELAY_MS;
      if (attempt < RETRY_ATTEMPTS) {
        console.warn(`    ⚠ ${label} — próba ${attempt}/${RETRY_ATTEMPTS}, retry za ${delay}ms: ${err.message}`);
        await sleep(delay);
      } else {
        throw err;
      }
    }
  }
}

// ─── Shoper: pobierz jedno zamówienie po ID ───────────────────────────────────

async function fetchOrder(orderId) {
  return withRetry(async () => {
    const res = await fetch(`${SHOP_URL}/webapi/rest/orders/${orderId}`, { headers: HEADERS });
    if (res.status === 404) return null; // zamówienie nie istnieje w Shoperze
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`orders/${orderId} (${res.status}): ${body.slice(0, 200)}`);
    }
    return res.json();
  }, `orders/${orderId}`);
}

// ─── Wyciągnij PII z zamówienia ───────────────────────────────────────────────

function extractPii(order) {
  if (!order) return null;

  const email = (order.email ?? order.client_email ?? "").toLowerCase().trim();

  // Shoper zwraca dane adresowe w delivery_address lub billing_address
  const addr = order.delivery_address ?? order.billing_address ?? {};

  // Imię i nazwisko: próbuj różnych pól (różne wersje API Shopera)
  let firstName = (addr.firstname ?? addr.first_name ?? order.delivery_firstname ?? "").trim();
  let lastName  = (addr.lastname  ?? addr.last_name  ?? order.delivery_lastname  ?? "").trim();

  // Fallback: delivery_fullname "Jan Kowalski" → split
  if (!firstName && !lastName) {
    const full = (addr.name ?? order.delivery_fullname ?? "").trim();
    if (full) {
      const parts = full.split(" ");
      firstName = parts[0] ?? "";
      lastName  = parts.slice(1).join(" ");
    }
  }

  return { email: email || null, firstName: firstName || null, lastName: lastName || null };
}

// ─── Przetwórz jeden batch client_id → order_id → Shoper → update ─────────

async function processBatch(sb, batch, stats) {
  // Równoległe requesty do Shopera
  const results = await Promise.all(
    batch.map(async ({ clientId, orderId }) => {
      try {
        const order = await fetchOrder(orderId);
        const pii   = extractPii(order);

        if (!pii || !pii.email) {
          return { clientId, ok: false, reason: "brak emaila w zamówieniu" };
        }

        const update = {
          email_encrypted:      encrypt(pii.email),
          first_name_encrypted: encrypt(pii.firstName),
          last_name_encrypted:  encrypt(pii.lastName),
        };

        const { error } = await sb
          .from("master_key")
          .update(update)
          .eq("client_id", clientId);

        if (error) throw new Error(error.message);
        return { clientId, ok: true };

      } catch (err) {
        return { clientId, ok: false, reason: err.message };
      }
    })
  );

  for (const r of results) {
    if (r.ok) {
      stats.updated++;
    } else {
      stats.failed++;
      if (stats.failed <= 20) {
        // Loguj pierwsze błędy żeby nie zaśmiecić terminala
        console.warn(`    ⚠ ${r.clientId}: ${r.reason}`);
      }
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  checkEnv();

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
  const cp = loadCheckpoint();

  console.log("🔑 PII Backfill — start");
  if (cp.lastClientId) {
    console.log(`   Checkpoint: wznawianie od client_id > "${cp.lastClientId}"`);
  }

  // Pobierz łączną liczbę rekordów do uzupełnienia (dla % globalnego)
  console.log("📊 Pobieram łączną liczbę rekordów do uzupełnienia...");
  let countQuery = sb
    .from("master_key")
    .select("client_id", { count: "exact", head: true })
    .is("email_encrypted", null);
  if (cp.lastClientId) countQuery = countQuery.gt("client_id", cp.lastClientId);

  const { count: totalToProcess, error: countErr } = await countQuery;
  if (countErr) {
    console.error("❌ Błąd liczenia rekordów:", countErr.message);
    process.exit(1);
  }

  if (!totalToProcess || totalToProcess === 0) {
    console.log("✅ Wszystkie rekordy mają już email_encrypted — nic do zrobienia.");
    return;
  }

  console.log(`   Łącznie do uzupełnienia: ${totalToProcess}\n`);

  const stats = { updated: 0, failed: 0, noOrder: 0 };
  let globalProcessed = 0;
  let lastClientId = cp.lastClientId;

  // Główna pętla — pobiera 1000 rekordów naraz aż do wyczerpania wszystkich
  while (true) {
    // Pobierz kolejnych 1000 bez email_encrypted
    let query = sb
      .from("master_key")
      .select("client_id")
      .is("email_encrypted", null)
      .order("client_id", { ascending: true })
      .limit(1000);

    if (lastClientId) query = query.gt("client_id", lastClientId);

    const { data: vaultRows, error: vaultErr } = await query;
    if (vaultErr) {
      console.error("❌ Błąd pobierania master_key:", vaultErr.message);
      process.exit(1);
    }

    // Brak kolejnych rekordów — koniec
    if (!vaultRows || vaultRows.length === 0) {
      console.log("\n✅ Brak kolejnych rekordów — zakończono.");
      break;
    }

    const clientIds = vaultRows.map((r) => r.client_id);

    // Znajdź order_id dla tego batcha
    const orderMap = new Map();
    for (let i = 0; i < clientIds.length; i += 500) {
      const slice = clientIds.slice(i, i + 500);
      const { data: evRows, error: evErr } = await sb
        .from("client_product_events")
        .select("client_id, order_id")
        .in("client_id", slice)
        .not("order_id", "is", null)
        .limit(slice.length * 5);

      if (evErr) {
        console.warn(`  ⚠ Błąd client_product_events batch ${i}: ${evErr.message}`);
        continue;
      }

      for (const row of (evRows ?? [])) {
        if (!orderMap.has(row.client_id) && row.order_id) {
          orderMap.set(row.client_id, String(row.order_id));
        }
      }
    }

    const noOrder = clientIds.filter((id) => !orderMap.has(id));
    stats.noOrder += noOrder.length;

    const toProcess = clientIds
      .filter((id) => orderMap.has(id))
      .map((clientId) => ({ clientId, orderId: orderMap.get(clientId) }));

    // Przetwórz w batchach po CONCURRENCY
    for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
      const batch = toProcess.slice(i, i + CONCURRENCY);
      await processBatch(sb, batch, stats);
      if (i + CONCURRENCY < toProcess.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    // Checkpoint — zapisz ostatni client_id z porcji
    lastClientId = clientIds[clientIds.length - 1];
    saveCheckpoint(lastClientId);

    // Loguj globalny postęp po każdej porcji 1000
    globalProcessed += clientIds.length;
    const pct = Math.min(100, Math.round((globalProcessed / totalToProcess) * 100));
    console.log(
      `  [${pct}%] ${globalProcessed}/${totalToProcess} — ` +
      `OK: ${stats.updated}, błędy: ${stats.failed}, brak order_id: ${stats.noOrder}`
    );
  }

  // Podsumowanie
  console.log("\n─────────────────────────────────────────");
  console.log("✅ Gotowe!");
  console.log(`   Uzupełniono:       ${stats.updated}`);
  console.log(`   Błędy/brak danych: ${stats.failed}`);
  console.log(`   Brak order_id:     ${stats.noOrder}`);
  console.log(`   Łącznie w sesji:   ${globalProcessed}`);
}

main().catch((err) => {
  console.error("❌ Błąd krytyczny:", err.message);
  process.exit(1);
});
