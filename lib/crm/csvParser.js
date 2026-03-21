// lib/crm/csvParser.js
// Zero-dependency CSV parser — brak importów zewnętrznych, działa w Node.js i Edge.
// Nie używa PapaParse (browser globals powodowały crash Turbopack przy pierwszym ładowaniu).

/**
 * Auto-detect separatora na podstawie pierwszej linii.
 */
function detectSeparator(firstLine) {
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas     = (firstLine.match(/,/g) ?? []).length;
  const tabs       = (firstLine.match(/\t/g) ?? []).length;
  if (tabs >= semicolons && tabs >= commas) return "\t";
  return semicolons >= commas ? ";" : ",";
}

/**
 * Parsuje jedną linię CSV z uwzględnieniem quoted fields.
 * Obsługuje: pola w cudzysłowach, escaped quotes (""), separatory wewnątrz quotes.
 */
function parseLine(line, sep) {
  const fields = [];
  let i = 0;
  const len = line.length;

  while (i <= len) {
    if (i === len) { fields.push(""); break; }

    if (line[i] === '"') {
      // Quoted field
      let val = "";
      i++; // skip opening quote
      while (i < len) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') { val += '"'; i += 2; continue; } // escaped quote
          i++; break; // closing quote
        }
        val += line[i++];
      }
      fields.push(val);
      if (line[i] === sep) i++; // skip separator after closing quote
    } else {
      // Unquoted field — read until separator or end
      let end = i;
      while (end < len && line[end] !== sep) end++;
      fields.push(line.slice(i, end));
      i = end + 1;
    }
  }
  return fields;
}

/**
 * parseShoperCSV(fileContent, sourceFileName)
 * Parsuje string CSV (utf-8, BOM-safe, ';' lub ',' separator).
 * Zwraca array of row objects z nagłówkami lowercase jako kluczami.
 */
export function parseShoperCSV(fileContent, sourceFileName = "unknown") {
  // Usuń BOM
  const raw = typeof fileContent === "string" && fileContent.charCodeAt(0) === 0xFEFF
    ? fileContent.slice(1)
    : String(fileContent ?? "");

  // Normalizuj line endings
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");

  // Znajdź pierwszą niepustą linię jako nagłówek
  const headerLineIdx = lines.findIndex(l => l.trim().length > 0);
  if (headerLineIdx === -1) return [];

  const sep = detectSeparator(lines[headerLineIdx]);
  const headers = parseLine(lines[headerLineIdx], sep)
    .map(h => h.trim().toLowerCase());

  if (headers.length === 0 || headers.every(h => h === "")) return [];

  const rows = [];
  for (let i = headerLineIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue; // pomiń puste linie

    const values = parseLine(line, sep);
    const row = { _source_file: sourceFileName };
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = (values[j] ?? "").trim();
    }
    rows.push(row);
  }

  return rows;
}

/**
 * mergeMultipleCSVs(filesArray)
 * Przyjmuje [{name, content}], parsuje każdy CSV, deduplikuje po order_id.
 */
export function mergeMultipleCSVs(filesArray) {
  const allRows = [];
  const seenOrderIds = new Set();

  for (const { name, content } of filesArray) {
    let rows;
    try {
      rows = parseShoperCSV(content, name);
    } catch (err) {
      console.error(`[csvParser] Błąd parsowania ${name}:`, err.message);
      continue;
    }

    for (const row of rows) {
      const orderId = String(
        row.order_id ?? row.id ?? row.numer ?? row["numer zamówienia"] ?? row.number ?? ""
      ).trim();

      if (orderId && seenOrderIds.has(orderId)) continue;
      if (orderId) seenOrderIds.add(orderId);
      allRows.push(row);
    }
  }

  return allRows;
}
