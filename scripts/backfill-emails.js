#!/usr/bin/env node
/**
 * scripts/backfill-emails.js
 *
 * Jednorazowy backfill kolumny master_key.email.
 *
 * Co robi:
 *   1. Pobiera z master_key wszystkie rekordy gdzie email IS NULL
 *   2. Ściąga wszystkie zamówienia z Shoper API (z paginacją)
 *   3. Dla każdego unikalnego emaila z Shopera liczy MD5 i sprawdza
 *      czy pasuje do któregoś email_hash w master_key
 *   4. Aktualizuje pasujące rekordy — SET email = <plain email>
 *
 * Uruchomienie:
 *   node scripts/backfill-emails.js
 *
 * Bezpieczne do wielokrotnego uruchomienia (pomija już wypełnione rekordy).
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env.local") });

const { createClient } = require("@supabase/supabase-js");
const crypto           = require("crypto");

const SHOP_URL    = (process.env.SHOPER_URL ?? "").replace(/\/$/, "");
const API_TOKEN   = process.env.SHOPER_API_TOKEN ?? process.env.SHOPER_CLIENT_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const PAGE_SIZE   = 50;
const DELAY_MS    = 200; // pomiędzy stronami — szanuj rate limit Shopera

// ─── Walidacja env ────────────────────────────────────────────────────────────

function checkEnv() {
  const missing = [];
  if (!SHOP_URL)    missing.push("SHOPER_URL");
  if (!API_TOKEN)   missing.push("SHOPER_API_TOKEN");
  if (!SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!SUPABASE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length) {
    console.error("❌ Brakujące zmienne środowiskowe:", missing.join(", "));
    process.exit(1);
  }
}

// ─── MD5 ──────────────────────────────────────────────────────────────────────

function md5(str) {
  return crypto.createHash("md5").update(str.toLowerCase().trim()).digest("hex");
}

// ─── Shoper: pobierz wszystkie zamówienia ─────────────────────────────────────

async function fetchAllEmails() {
  const headers = { Authorization: `Bearer ${API_TOKEN}`, Accept: "application/json" };
  const emailSet = new Set();

  // Pobierz stronę 1 żeby ustalić liczbę stron
  const first = await fetch(`${SHOP_URL}/webapi/rest/orders?limit=${PAGE_SIZE}&page=1&sort[date]=ASC`, { headers });
  if (!first.ok) throw new Error(`Shoper API error ${first.status}`);
  const firstJson = await first.json();
  const totalPages = Number(firstJson.pages ?? 1);
  const totalOrders = Number(firstJson.count ?? 0);

  console.log(`📦 Shoper: ${totalOrders} zamówień, ${totalPages} stron`);

  // Zbierz emaile ze strony 1
  for (const order of (firstJson.list ?? [])) {
    const email = (order.email ?? order.client_email ?? "").toLowerCase().trim();
    if (email) emailSet.add(email);
  }

  // Pozostałe strony
  for (let page = 2; page <= totalPages; page++) {
    if (page % 50 === 0) process.stdout.write(`  strona ${page}/${totalPages}...\n`);

    const res = await fetch(`${SHOP_URL}/webapi/rest/orders?limit=${PAGE_SIZE}&page=${page}&sort[date]=ASC`, { headers });
    if (!res.ok) {
      console.warn(`  ⚠ Strona ${page} error ${res.status}, pomijam`);
      continue;
    }
    const json = await res.json();
    for (const order of (json.list ?? [])) {
      const email = (order.email ?? order.client_email ?? "").toLowerCase().trim();
      if (email) emailSet.add(email);
    }

    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`✉️  Unikalne emaile z Shopera: ${emailSet.size}`);
  return emailSet;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  checkEnv();

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

  // 1. Pobierz master_key gdzie email IS NULL
  console.log("🔍 Pobieram master_key (email IS NULL)...");
  const { data: vaultRows, error: vaultErr } = await sb
    .from("master_key")
    .select("email_hash, client_id")
    .is("email", null);

  if (vaultErr) throw new Error(`master_key fetch error: ${vaultErr.message}`);
  console.log(`   Rekordów do uzupełnienia: ${vaultRows.length}`);

  if (vaultRows.length === 0) {
    console.log("✅ Wszystkie rekordy mają już email — nic do zrobienia.");
    return;
  }

  // Zbuduj mapę hash → client_id dla szybkiego lookup
  const hashToClientId = new Map(vaultRows.map(r => [r.email_hash, r.client_id]));

  // 2. Pobierz wszystkie emaile z Shopera
  console.log("🌐 Pobieram zamówienia z Shoper API...");
  const allEmails = await fetchAllEmails();

  // 3. Dopasuj emaile do hashy
  console.log("🔗 Dopasowuję emaile do hashy MD5...");
  const updates = [];
  for (const email of allEmails) {
    const hash = md5(email);
    if (hashToClientId.has(hash)) {
      updates.push({ email_hash: hash, email });
    }
  }

  console.log(`   Dopasowano: ${updates.length} / ${vaultRows.length} rekordów`);

  if (updates.length === 0) {
    console.log("⚠️  Żadnych dopasowań — sprawdź czy SHOPER_URL i API_TOKEN są poprawne.");
    return;
  }

  // 4. Aktualizuj master_key
  console.log("💾 Aktualizuję master_key.email...");
  let updated = 0;
  let failed  = 0;

  for (const { email_hash, email } of updates) {
    const { error } = await sb
      .from("master_key")
      .update({ email })
      .eq("email_hash", email_hash);

    if (error) {
      console.warn(`  ⚠ Błąd update ${email_hash}: ${error.message}`);
      failed++;
    } else {
      updated++;
    }

    if (updated % 100 === 0) process.stdout.write(`  zaktualizowano ${updated}...\n`);
  }

  console.log(`\n✅ Gotowe!`);
  console.log(`   Zaktualizowano: ${updated}`);
  if (failed) console.log(`   Błędy:         ${failed}`);

  const missing = vaultRows.length - updated;
  if (missing > 0) {
    console.log(`   Brak dopasowania: ${missing} (klienci bez zamówień w Shoperze lub inny hash)`);
  }
}

main().catch(err => {
  console.error("❌ Błąd:", err.message);
  process.exit(1);
});
