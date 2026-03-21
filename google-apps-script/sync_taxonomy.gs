/**
 * SYNC TAXONOMY (PRODUCTS) → Supabase
 * ─────────────────────────────────────────────────────────────
 * Instrukcja:
 *  1. Otwórz Google Sheets z arkuszem PRODUCTS_V5_2MATKI
 *  2. W menu Rozszerzenia → Apps Script wklej ten plik
 *  3. Ustaw zmienne w Script Properties:
 *       Plik → Właściwości projektu → Właściwości skryptu
 *       SYNC_SECRET  = twój tajny token (ten sam co w .env)
 *       VERCEL_URL   = np. consensus-engine.vercel.app
 *  4. Uruchom setupTrigger() raz żeby aktywować automatyczną sync co 30 min
 *  5. Uruchom syncTaxonomy() ręcznie żeby przetestować
 * ─────────────────────────────────────────────────────────────
 */

var SYNC_SECRET = PropertiesService.getScriptProperties().getProperty("SYNC_SECRET") || "WSTAW_TOKEN";
var VERCEL_URL  = PropertiesService.getScriptProperties().getProperty("VERCEL_URL")  || "WSTAW_URL";
var SHEET_NAME  = "PRODUCTS_V5_2MATKI";

// ─── Mapowanie nagłówków arkusza → klucze API ──────────────────
var COLUMN_MAP = {
  "kodean":              "ean",
  "towar":               "name",
  "wariant":             "variant",
  "kolekcja":            "collection",
  "grupa":               "product_group",
  "tags_granularne":     "tags_granularne",
  "tags_domenowe":       "tags_domenowe",
  "filary_marki":        "filary_marki",
  "okazje":              "okazje",
  "segment_prezentowy":  "segment_prezentowy",
  "evergreen":           "evergreen",
  "price_avg":           "price_avg",
  "available":           "available",
};

function sendToWebhook(data, endpoint) {
  var url     = "https://" + VERCEL_URL + endpoint;
  var payload = JSON.stringify({ rows: data });
  var options = {
    method:      "post",
    contentType: "application/json",
    headers:     { Authorization: "Bearer " + SYNC_SECRET },
    payload:     payload,
    muteHttpExceptions: true,
  };
  var response = UrlFetchApp.fetch(url, options);
  var code     = response.getResponseCode();
  var body     = response.getContentText();
  Logger.log("HTTP " + code + ": " + body);
  if (code !== 200) {
    throw new Error("Webhook error " + code + ": " + body);
  }
  return JSON.parse(body);
}

function syncTaxonomy() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error("Arkusz '" + SHEET_NAME + "' nie istnieje");

  var data    = sheet.getDataRange().getValues();
  if (data.length < 2) { Logger.log("Brak danych"); return; }

  // Buduj mapowanie indeks → klucz API (normalizacja: lowercase, trim)
  var headers = data[0].map(function(h) { return String(h).toLowerCase().trim(); });
  var colMap  = {};
  headers.forEach(function(i, idx) {
    var key = COLUMN_MAP[headers[idx]];
    if (key) colMap[idx] = key;
  });

  // Poprawka: iteruj po indeksach
  colMap = {};
  for (var i = 0; i < headers.length; i++) {
    var key = COLUMN_MAP[headers[i]];
    if (key) colMap[i] = key;
  }

  var rows = [];
  for (var r = 1; r < data.length; r++) {
    var raw = data[r];
    // Pomiń wiersze bez EAN
    if (!raw[0] || String(raw[0]).trim() === "") continue;
    var obj = {};
    for (var c in colMap) {
      var val = raw[c];
      obj[colMap[c]] = (val === null || val === undefined) ? "" : String(val);
    }
    rows.push(obj);
  }

  if (rows.length === 0) { Logger.log("Brak wierszy do wysłania"); return; }

  // Wysyłaj partiami po 500 żeby nie przekroczyć limitu payload
  var BATCH = 500;
  var total = 0;
  for (var start = 0; start < rows.length; start += BATCH) {
    var batch  = rows.slice(start, start + BATCH);
    var result = sendToWebhook(batch, "/api/sync/taxonomy");
    total += result.upserted || 0;
    Logger.log("Batch " + (start / BATCH + 1) + ": " + result.upserted + " rekordów");
  }

  Logger.log("Łącznie zsynchronizowano: " + total + " rekordów");
}

function setupTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === "syncTaxonomy") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("syncTaxonomy")
    .timeBased()
    .everyMinutes(30)
    .create();
  Logger.log("Trigger ustawiony: syncTaxonomy co 30 minut");
}
