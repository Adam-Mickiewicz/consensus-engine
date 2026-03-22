// lib/crm/csvFlatten.js
// Browser-safe kopia flattenShoperCSV z lib/crm/etl.js — bez importu crypto.
// Spłaszcza wiersze CSV z Shoper do tablicy line-itemów.

function normalizeEmail(email) {
  return String(email ?? "").toLowerCase().trim();
}

/**
 * Normalizuje nagłówki CSV z eksportu Shoper i spłaszcza produkty 1..59
 * do tablicy line-itemów.
 *
 * Wejście: array of row objects (z parseShoperCSV, klucze lowercase)
 * Wyjście: [{order_id, email, date, sum, product_name, qty, price, source_file}]
 */
export function flattenShoperCSV(rows) {
  const lineItems = [];

  for (const row of rows) {
    const order_id = String(
      row.order_id ?? row.id ?? row.numer ?? row["numer zamówienia"] ?? row.number ?? ""
    ).trim();
    const email = normalizeEmail(
      row.email ?? row["e-mail"] ?? row["adres e-mail"] ?? row.mail ?? ""
    );
    const date = String(
      row.date ?? row.data ?? row["data zamówienia"] ?? row.add_date ?? row.date_add ?? ""
    ).trim().slice(0, 10);
    const sum = parseFloat(
      String(row.sum ?? row.suma ?? row["suma zamówienia"] ?? row.total ?? row.total_price ?? 0)
        .replace(",", ".")
    ) || 0;
    const sourceFile = row._source_file ?? "unknown";

    if (!order_id || !email || !date) continue;

    let hasAnyProduct = false;

    for (let i = 1; i <= 59; i++) {
      const productName = (
        row[`product_name ${i}`] ?? row[`nazwa produktu ${i}`] ?? ""
      ).trim();
      if (!productName) continue;

      hasAnyProduct = true;
      const qty = parseInt(row[`product_quantity ${i}`] ?? row[`ilość ${i}`] ?? "1") || 1;
      const price = parseFloat(
        String(row[`product_price ${i}`] ?? row[`cena ${i}`] ?? "0").replace(",", ".")
      ) || 0;

      lineItems.push({ order_id, email, date, sum, product_name: productName, qty, price, source_file: sourceFile });
    }

    if (!hasAnyProduct) {
      lineItems.push({ order_id, email, date, sum, product_name: null, qty: 1, price: sum, source_file: sourceFile });
    }
  }

  return lineItems;
}
