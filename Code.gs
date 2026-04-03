// ================================================================
//  ДЭЭРЭЛХЭЛТ МЭДЭГДЛИЙН СИСТЕМ — Google Apps Script backend
//  script.google.com дээр шинэ project үүсгэж энэ кодыг тавина
// ================================================================

var SHEET_NAME = "Мэдэгдлүүд";

var HEADERS = [
  "Код", "Огноо", "Анги түвшин", "Анги", "Бүлэг", "Нэр", "Хүйс",
  "Мэдэгдэгч", "Дээрэлхэлтийн төрөл", "Давтамж", "Болсон газар",
  "Тайлбар", "Гэрч", "Дээрэлхэгчийн нэр", "Дээрэлхэгчийн анги",
  "Дээрэлхэгчийн хүйс", "Дээрэлхэгчийн тодорхойлолт",
  "Нотлох баримт", "Өмнө мэдэгдсэн", "Нэмэлт тайлбар",
  "Статус", "Email хүлээн авагч"
];

// ── GET запрос: жагсаалт, статус шинэчлэлт, код хайлт ──
function doGet(e) {
  var p = e.parameter;
  if (p.action === "list")         return listRows(p.level || "");
  if (p.action === "updateStatus") return updateStatus(p.code, p.status);
  if (p.code)                      return trackCode(p.code);
  return jsonOut({ error: "Unknown action" });
}

// ── POST запрос: шинэ мэдэгдэл хадгалах ──
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    saveRow(payload);
    sendEmail(payload);
    return jsonOut({ success: true, code: payload.clientCode });
  } catch (err) {
    return jsonOut({ success: false, error: err.toString() });
  }
}

// ── Sheet авах / анх удаа үүсгэх ──
function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    var hdr = sh.getRange(1, 1, 1, HEADERS.length);
    hdr.setBackground("#5BA4CF")
       .setFontColor("#ffffff")
       .setFontWeight("bold")
       .setFontSize(11);
    sh.setFrozenRows(1);
    sh.setColumnWidth(1, 90);   // Код
    sh.setColumnWidth(2, 130);  // Огноо
    sh.setColumnWidth(12, 300); // Тайлбар
    sh.setColumnWidth(21, 160); // Статус
  }
  return sh;
}

// ── Мэдэгдэл хадгалах ──
function saveRow(p) {
  var sh = getSheet();
  var dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
  sh.appendRow([
    p.clientCode      || "",
    dateStr,
    p.schoolLevel     || "",
    p.angi            || "",
    p.buleg           || "",
    p.ner             || "",
    p.huiis           || "",
    p.medegedech      || "",
    p.torlud          || "",
    p.davtamj         || "",
    p.gazar           || "",
    p.tailbar         || "",
    p.gerech          || "",
    p.bully_ner       || "",
    p.bully_angi      || "",
    p.bully_huiis     || "",
    p.bully_todorh    || "",
    p.notloh          || "",
    p.omno_medegsed   || "",
    p.nemeltel        || "",
    "Хянагдаж байна",         // анхны статус
    p.recipientEmail  || ""
  ]);
}

// ── И-мэйл илгээх ──
function sendEmail(p) {
  var to = p.recipientEmail;
  if (!to) return;
  var subject = "🛡️ Шинэ мэдэгдэл [" + (p.schoolLevel||"?") + "] — Код: " + p.clientCode;
  var body = [
    "Шинэ дээрэлхэлтийн мэдэгдэл ирлээ.\n",
    "Tracking код  : " + p.clientCode,
    "Анги          : " + (p.angi||"—") + " " + (p.buleg||""),
    "Мэдэгдэгч     : " + (p.ner||"Нууцлагдсан") + " (" + (p.medegedech||"—") + ")",
    "Дээрэлхэлт    : " + (p.torlud||"—"),
    "Болсон газар  : " + (p.gazar||"—"),
    "\nТайлбар:\n" + (p.tailbar||"—"),
    "\n\nDashboard руу ороод мэдэгдлийг харж статусыг шинэчилнэ үү."
  ].join("\n");
  GmailApp.sendEmail(to, subject, body);
}

// ── Жагсаалт буцаах (admin dashboard-д) ──
function listRows(level) {
  var sh   = getSheet();
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return jsonOut({ rows: [] });

  var CI = {};
  HEADERS.forEach(function(h, i) { CI[h] = i; });

  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    // Хэрэв level шүүлтүүр байвал тохирохыг л буцаана
    if (level && (r[CI["Анги түвшин"]] + "") !== level) continue;
    rows.push({
      code:          r[CI["Код"]]                         + "",
      date:          r[CI["Огноо"]]                       + "",
      schoolLevel:   r[CI["Анги түвшин"]]                 + "",
      angi:          r[CI["Анги"]]                        + "",
      buleg:         r[CI["Бүлэг"]]                       + "",
      ner:           r[CI["Нэр"]]                         + "",
      huiis:         r[CI["Хүйс"]]                        + "",
      medegedech:    r[CI["Мэдэгдэгч"]]                   + "",
      torlud:        r[CI["Дээрэлхэлтийн төрөл"]]         + "",
      davtamj:       r[CI["Давтамж"]]                     + "",
      gazar:         r[CI["Болсон газар"]]                 + "",
      tailbar:       r[CI["Тайлбар"]]                     + "",
      gerech:        r[CI["Гэрч"]]                        + "",
      bully_ner:     r[CI["Дээрэлхэгчийн нэр"]]           + "",
      bully_angi:    r[CI["Дээрэлхэгчийн анги"]]          + "",
      notloh:        r[CI["Нотлох баримт"]]               + "",
      omno_medegsed: r[CI["Өмнө мэдэгдсэн"]]              + "",
      nemeltel:      r[CI["Нэмэлт тайлбар"]]              + "",
      status:        r[CI["Статус"]]                       + ""
    });
  }
  return jsonOut({ rows: rows });
}

// ── Статус шинэчлэх ──
function updateStatus(code, newStatus) {
  if (!code || !newStatus) return jsonOut({ success: false, error: "Missing params" });
  var sh   = getSheet();
  var data = sh.getDataRange().getValues();
  var CI   = {};
  HEADERS.forEach(function(h, i) { CI[h] = i; });
  var statusCol = CI["Статус"] + 1; // 1-based

  for (var i = 1; i < data.length; i++) {
    if ((data[i][CI["Код"]] + "") === (code + "")) {
      sh.getRange(i + 1, statusCol).setValue(newStatus);
      return jsonOut({ success: true });
    }
  }
  return jsonOut({ success: false, error: "Code not found" });
}

// ── track.html-аас код хайх ──
function trackCode(code) {
  var sh   = getSheet();
  var data = sh.getDataRange().getValues();
  var CI   = {};
  HEADERS.forEach(function(h, i) { CI[h] = i; });

  for (var i = 1; i < data.length; i++) {
    if ((data[i][CI["Код"]] + "") === (code + "")) {
      return jsonOut({
        success: true,
        code:    data[i][CI["Код"]]    + "",
        status:  data[i][CI["Статус"]] + "",
        date:    data[i][CI["Огноо"]]  + ""
      });
    }
  }
  return jsonOut({ success: false });
}

// ── JSON хариу ──
function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
