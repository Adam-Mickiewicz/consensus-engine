/**
 * SYNC PROMOTIONS → Supabase
 * ─────────────────────────────────────────────────────────────
 * Instrukcja:
 *  1. Otwórz Google Sheets z arkuszem PROMO_MATRIX
 *  2. W menu Rozszerzenia → Apps Script wklej ten plik
 *  3. Ustaw zmienne poniżej (lub użyj Script Properties):
 *       Plik → Właściwości projektu → Właściwości skryptu
 *       SYNC_SECRET  = twój tajny token (ten sam co w .env)
 *       VERCEL_URL   = np. consensus-engine.vercel.app
 *  4. Uruchom setupTrigger() raz żeby aktywować automatyczną sync co 30 min
 *  5. Uruchom syncPromotions() ręcznie żeby przetestować
 * ─────────────────────────────────────────────────────────────
 */

var SYNC_SECRET = PropertiesService.getScriptProperties().getProperty("SYNC_SECRET") || "WSTAW_TOKEN";
var VERCEL_URL  = PropertiesService.getScriptProperties().getProperty("VERCEL_URL")  || "WSTAW_URL";
var SHEET_NAME  = "PROMO_MATRIX";

// ─── Mapowanie kolumn ──────────────────────────────────────────
// Nagłówki w wierszu 1 arkusza PROMO_MATRIX powinny zawierać te nazwy
// (wielkość liter nieistotna po normalizacji)
var COLUMN_MAP = {
  "id":               "id",
  "nazwa promocji":   "promo_name",
  "typ promocji":     "promo_type",
  "typ rabatu":       "discount_type",
  "wartość":          "discount_value",
  "kategorie":        "category_list",
  "produkty":         "product_list",
  "wymaga kodu":      "requires_code",
  "kod":              "code_name",
  "darmowa dostawa":  "free_shipping",
  "data od":          "start_date",
  "data do":          "end_date",
  "sezon":            "season",
  "uwagi":            "notes",
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

function syncPromotions() {
  var ss      = SpreadsheetApp.getActiveSpreadsheet();
  var sheet   = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error("Arkusz '" + SHEET_NAME + "' nie istnieje");

  var data    = sheet.getDataRange().getValues();
  if (data.length < 2) { Logger.log("Brak danych"); return; }

  // Buduj mapowanie indeks kolumny → klucz API
  var headers = data[0].map(function(h) { return String(h).toLowerCase().trim(); });
  var colMap  = {};
  headers.forEach(function(h, i) {
    var key = COLUMN_MAP[h];
    if (key) colMap[i] = key;
  });

  var rows = [];
  for (var r = 1; r < data.length; r++) {
    var raw = data[r];
    // Pomiń puste wiersze
    if (!raw[0] && !raw[1]) continue;
    var obj = {};
    Object.keys(colMap).forEach(function(i) {
      var val = raw[i];
      obj[colMap[i]] = (val === null || val === undefined) ? "" : String(val);
    });
    // Konwertuj daty na ISO string jeśli to obiekt Date
    ["start_date", "end_date"].forEach(function(k) {
      if (obj[k] && obj[k] !== "") {
        var d = new Date(obj[k]);
        if (!isNaN(d)) obj[k] = Utilities.formatDate(d, "UTC", "yyyy-MM-dd");
      }
    });
    rows.push(obj);
  }

  if (rows.length === 0) { Logger.log("Brak wierszy do wysłania"); return; }

  var result = sendToWebhook(rows, "/api/sync/promotions");
  Logger.log("Zsynchronizowano: " + result.upserted + " rekordów");
}

function setupTrigger() {
  // Usuń stare triggery tej funkcji żeby uniknąć duplikatów
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === "syncPromotions") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("syncPromotions")
    .timeBased()
    .everyMinutes(30)
    .create();
  Logger.log("Trigger ustawiony: syncPromotions co 30 minut");
}
