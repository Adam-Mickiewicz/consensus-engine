/**
 * SYNC PRICE HISTORY → Supabase
 * ─────────────────────────────────────────────────────────────
 * Instrukcja:
 *  1. Otwórz Google Sheets: Matryca_cen
 *  2. W menu Rozszerzenia → Apps Script wklej ten plik
 *  3. Ustaw Script Properties:
 *       SYNC_SECRET  = twój tajny token (ten sam co w .env)
 *       VERCEL_URL   = consensus-engine-chi.vercel.app
 *  4. Uruchom setupTrigger() raz żeby aktywować automatyczną sync raz dziennie
 *  5. Uruchom syncPriceHistory() ręcznie żeby przetestować
 * ─────────────────────────────────────────────────────────────
 */

var SHEET_NAME = "Arkusz1";

// Mapowanie nagłówków → klucze API (lowercase, trim)
var COLUMN_MAP = {
  "category_id": "category_id",
  "date_from":   "date_from",
  "date_to":     "date_to",
  "avg_price":   "avg_price",
};

function sendToWebhook(endpoint, rows) {
  var props  = PropertiesService.getScriptProperties();
  var secret = props.getProperty('SYNC_SECRET');
  var url    = 'https://' + props.getProperty('VERCEL_URL') + endpoint;

  var response = UrlFetchApp.fetch(url, {
    method:      'POST',
    contentType: 'application/json',
    headers:     { 'Authorization': 'Bearer ' + secret },
    payload:     JSON.stringify({ rows: rows }),
    muteHttpExceptions: true,
  });

  var code   = response.getResponseCode();
  var result = JSON.parse(response.getContentText());
  if (code !== 200) throw new Error('HTTP ' + code + ': ' + JSON.stringify(result));
  return result;
}

function formatDate(d) {
  if (!d) return null;
  if (d instanceof Date) return Utilities.formatDate(d, 'UTC', 'yyyy-MM-dd');
  var s = d.toString().trim();
  return s === '' ? null : s;
}

function syncPriceHistory() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error("Arkusz '" + SHEET_NAME + "' nie istnieje");

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) { Logger.log("Brak danych"); return; }

  // Buduj mapowanie: indeks kolumny → klucz API
  var headers = data[0].map(function(h) { return String(h).toLowerCase().trim(); });
  var colMap  = {};
  for (var i = 0; i < headers.length; i++) {
    var key = COLUMN_MAP[headers[i]];
    if (key) colMap[i] = key;
  }

  // Znajdź indeks category_id
  var catColIdx = -1;
  for (var ci in colMap) {
    if (colMap[ci] === 'category_id') { catColIdx = parseInt(ci); break; }
  }

  var rows = [];
  for (var r = 1; r < data.length; r++) {
    var raw = data[r];

    // Pomiń puste wiersze (bez category_id)
    var catVal = catColIdx >= 0 ? raw[catColIdx] : raw[0];
    if (!catVal || String(catVal).trim() === '') continue;

    var obj = {};
    for (var c in colMap) {
      var fieldKey = colMap[c];
      var val      = raw[c];

      if (fieldKey === 'date_from') {
        obj[fieldKey] = formatDate(val);
      } else if (fieldKey === 'date_to') {
        obj[fieldKey] = formatDate(val);
      } else if (fieldKey === 'avg_price') {
        obj[fieldKey] = parseFloat(String(val).replace(',', '.')) || 0;
      } else {
        obj[fieldKey] = String(val).trim();
      }
    }
    rows.push(obj);
  }

  if (rows.length === 0) { Logger.log("Brak wierszy do wysłania"); return; }

  var result = sendToWebhook('/api/sync/price-history', rows);
  Logger.log("Zsynchronizowano: " + (result.upserted || 0) + " rekordów");
}

function setupTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'syncPriceHistory') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('syncPriceHistory')
    .timeBased()
    .everyDays(1)
    .atHour(3)
    .create();
  Logger.log("Trigger ustawiony: syncPriceHistory raz dziennie o 3:00");
}
