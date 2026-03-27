#!/usr/bin/env node
// scripts/export-backup.js
// Eksportuje tabele Supabase do plików CSV w folderze backup/
//
// Uruchomienie:
//   node scripts/export-backup.js

require("dotenv").config({ path: require("path").join(__dirname, "../.env.local") });

const fs   = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// ─── Konfiguracja ─────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TABLES = ["client_product_events", "clients_360", "master_key"];
const BACKUP_DIR = path.join(__dirname, "../backup");
const PAGE_SIZE  = 1000; // wierszy na request

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeCsvField(value) {
  if (value === null || value === undefined) return "";
  const str = typeof value === "object" ? JSON.stringify(value) : String(value);
  // Escapuj cudzysłowy i owij jeśli pole zawiera przecinek, nową linię lub cudzysłów
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function rowsToCsv(rows) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(escapeCsvField).join(","),
    ...rows.map(row => headers.map(h => escapeCsvField(row[h])).join(",")),
  ];
  return lines.join("\n") + "\n";
}

const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5000;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPageWithRetry(supabase, table, offset) {
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(offset, offset + PAGE_SIZE - 1);

    if (!error) return { data, skipped: false };

    console.error(`\n  [WARN] Błąd przy pobieraniu ${table} (offset ${offset}), próba ${attempt}/${RETRY_ATTEMPTS}: ${error.message}`);
    if (attempt < RETRY_ATTEMPTS) await sleep(RETRY_DELAY_MS);
  }

  console.error(`  [ERROR] Pominięto offset ${offset} dla ${table} — wszystkie ${RETRY_ATTEMPTS} próby nieudane.`);
  return { data: [], skipped: true };
}

async function fetchAllRows(supabase, table) {
  const rows = [];
  let offset = 0;
  let lastLoggedMilestone = 0;

  while (true) {
    const { data, skipped } = await fetchPageWithRetry(supabase, table, offset);

    if (data.length > 0) rows.push(...data);

    const milestone = Math.floor(rows.length / 10000) * 10000;
    if (milestone > lastLoggedMilestone) {
      console.log(`  ${table}: pobrano ${rows.length} wierszy...`);
      lastLoggedMilestone = milestone;
    } else {
      process.stdout.write(`  ${table}: pobrano ${rows.length} wierszy...\r`);
    }

    if (!skipped && data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Brak NEXT_PUBLIC_SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY w .env.local");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Utwórz folder backup/ jeśli nie istnieje
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`Utworzono folder: ${BACKUP_DIR}`);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

  for (const table of TABLES) {
    console.log(`\nEksportuję: ${table}`);

    const rows = await fetchAllRows(supabase, table);
    console.log(`  ${table}: łącznie ${rows.length} wierszy`);

    const csv = rowsToCsv(rows);
    const filename = `${table}_${timestamp}.csv`;
    const filepath = path.join(BACKUP_DIR, filename);

    fs.writeFileSync(filepath, csv, "utf8");
    const sizeKb = (Buffer.byteLength(csv, "utf8") / 1024).toFixed(1);
    console.log(`  Zapisano: backup/${filename} (${sizeKb} KB)`);
  }

  console.log("\nEksport zakończony.");
}

main().catch(err => {
  console.error("\nBłąd:", err.message);
  process.exit(1);
});
