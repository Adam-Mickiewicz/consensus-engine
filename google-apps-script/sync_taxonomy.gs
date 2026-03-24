/**
 * SYNC TAXONOMY (PRODUCTS) → Supabase
 * ─────────────────────────────────────────────────────────────
 * Instrukcja:
 *  1. Otwórz Google Sheets: Kategorie_CRM360_Taxonomy
 *  2. W menu Rozszerzenia → Apps Script wklej ten plik
 *  3. Ustaw Script Properties:
 *       SYNC_SECRET  = twój tajny token (ten sam co w .env)
 *       VERCEL_URL   = consensus-engine-chi.vercel.app
 *  4. Uruchom setupTrigger() raz żeby aktywować automatyczną sync co 30 min
 *  5. Uruchom syncTaxonomy() ręcznie żeby przetestować
 * ─────────────────────────────────────────────────────────────
 */

var SHEET_NAME = "PRODUCTS_V5_2+warianty";

// Mapowanie nagłówków arkusza → klucze API (lowercase, trim)
var COLUMN_MAP = {
  "kodean":                "ean",
  "towar":                 "name",
  "wariant":               "variant",
  "kolekcja":              "collection",
  "kategoria produktowa":  "product_group",
  "tags_domenowe":         "tags_domenowe",
  "tags_granularne":       "tags_granularne",
  "okazje":                "okazje",
  "segment_prezentowy":    "segment_prezentowy",
  "data uruchomienia":     "launch_date",
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

function syncTaxonomy() {
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

  // Znajdź indeks kolumny EAN (ean powinien być pierwszą kolumną, ale szukamy dynamicznie)
  var eanColIdx = -1;
  for (var ci in colMap) {
    if (colMap[ci] === 'ean') { eanColIdx = parseInt(ci); break; }
  }

  var rows = [];
  for (var r = 1; r < data.length; r++) {
    var raw = data[r];

    // Pomiń wiersze bez KodEAN
    var eanVal = eanColIdx >= 0 ? raw[eanColIdx] : raw[0];
    if (!eanVal || String(eanVal).trim() === '') continue;

    var obj = {};
    for (var c in colMap) {
      var fieldKey = colMap[c];
      var val      = raw[c];

      if (fieldKey === 'launch_date') {
        obj[fieldKey] = formatDate(val);
      } else if (fieldKey === 'variant') {
        var s = (val === null || val === undefined) ? '' : String(val).trim();
        obj[fieldKey] = (s === '' || s === '-') ? null : s;
      } else {
        obj[fieldKey] = (val === null || val === undefined) ? '' : String(val);
      }
    }
    rows.push(obj);
  }

  if (rows.length === 0) { Logger.log("Brak wierszy do wysłania"); return; }

  var BATCH = 500;
  var total = 0;
  for (var start = 0; start < rows.length; start += BATCH) {
    var batch  = rows.slice(start, start + BATCH);
    var result = sendToWebhook('/api/sync/taxonomy', batch);
    total += result.upserted || 0;
    Logger.log("Batch " + (Math.floor(start / BATCH) + 1) + ": " + (result.upserted || 0) + " rekordów");
  }

  Logger.log("Łącznie zsynchronizowano: " + total + " rekordów");
}

function setupTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'syncTaxonomy') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('syncTaxonomy')
    .timeBased()
    .everyMinutes(30)
    .create();
  Logger.log("Trigger ustawiony: syncTaxonomy co 30 minut");
}
