// lib/crm/csvParser.js
// Parsowanie plików CSV z eksportu Shoper — obsługa polskich znaków, auto-detect separatora.

import Papa from "papaparse";

/**
 * Auto-detect CSV separator na podstawie pierwszej linii.
 * Shoper eksportuje zazwyczaj z ';' lub ','.
 */
function detectSeparator(content) {
  const firstLine = content.split("\n")[0] ?? "";
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return semicolons >= commas ? ";" : ",";
}

/**
 * parseShoperCSV(fileContent, sourceFileName)
 * Parsuje string CSV (utf-8). Zwraca array obiektów z nagłówkami jako kluczami.
 * Obsługuje BOM (UTF-8 BOM z Excela/Shoper).
 */
export function parseShoperCSV(fileContent, sourceFileName = "unknown") {
  // Usuń BOM jeśli istnieje
  const content = fileContent.startsWith("\uFEFF")
    ? fileContent.slice(1)
    : fileContent;

  const delimiter = detectSeparator(content);

  const { data, errors } = Papa.parse(content, {
    delimiter,
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
    transform: (v) => (typeof v === "string" ? v.trim() : v),
    // Nie używaj dynamicTyping — zachowaj stringi (daty, EANy)
    dynamicTyping: false,
  });

  if (errors.length > 0) {
    const criticalErrors = errors.filter((e) => e.type === "Delimiter");
    if (criticalErrors.length > 0) {
      throw new Error(
        `Błąd parsowania CSV (${sourceFileName}): ${criticalErrors[0].message}`
      );
    }
  }

  return (data ?? []).map((row) => ({ ...row, _source_file: sourceFileName }));
}

/**
 * mergeMultipleCSVs(filesArray)
 * Przyjmuje [{name, content}], parsuje każdy CSV, dodaje _source_file,
 * deduplikuje po order_id (zachowuje pierwsze wystąpienie).
 * Zwraca merged array of row objects.
 */
export function mergeMultipleCSVs(filesArray) {
  const allRows = [];
  const seenOrderIds = new Set();

  for (const { name, content } of filesArray) {
    let rows;
    try {
      rows = parseShoperCSV(content, name);
    } catch (err) {
      console.error(`[csvParser] Błąd parsowania pliku ${name}:`, err.message);
      continue;
    }

    for (const row of rows) {
      // Próbuj znaleźć order_id pod różnymi nazwami kolumn
      const orderId =
        row.order_id ??
        row.id ??
        row.numer ??
        row["numer zamówienia"] ??
        row.number ??
        null;

      if (orderId && seenOrderIds.has(String(orderId).trim())) {
        // Duplikat — pomijamy
        continue;
      }
      if (orderId) {
        seenOrderIds.add(String(orderId).trim());
      }

      allRows.push(row);
    }
  }

  return allRows;
}
