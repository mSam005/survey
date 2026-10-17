/**
 * Backend for the survey: saves every response to a Google Sheet and sends YOU a short
 * notification email ("Name submitted your survey"). All results/graphs/analysis are viewed
 * in the dashboard (admin.html), like Google Forms / Tally.
 *
 * Setup: paste this file into Extensions > Apps Script of a NEW Google Sheet, edit the lines below,
 * then Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 */
const OWNER_EMAIL = 'YOUR_EMAIL@gmail.com';   // <-- notification goes here
const ADMIN_TOKEN = 'CHANGE_THIS_SECRET';     // <-- password for the dashboard (admin.html)
const DASHBOARD_URL = '';                      // <-- optional: your site's admin.html link, shown in the email
const SHEET_NAME = 'Responses';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const p = JSON.parse(e.postData.contents);
    const total = saveRow_(p);
    sendNotification_(p, total);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  const prm = (e && e.parameter) || {};
  if (prm.action === 'list') {
    if (prm.token !== ADMIN_TOKEN) return json_({ ok: false, error: 'Wrong admin token' });
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sh || sh.getLastRow() < 2) return json_({ ok: true, rows: [] });
    const vals = sh.getDataRange().getDisplayValues();
    const head = vals[0];
    const rows = vals.slice(1).map(function (r) {
      const o = {};
      head.forEach(function (h, i) { o[h] = r[i]; });
      return o;
    });
    return json_({ ok: true, rows: rows });
  }
  return json_({ ok: true, message: 'Survey backend is running.' });
}

function saveRow_(p) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  const rec = {};
  rec.ResponseID = p.id;
  rec.SubmittedAt = p.submittedAt;
  Object.keys(p.answers).forEach(function (k) { rec[k] = p.answers[k]; });
  Object.keys(p.scores || {}).forEach(function (k) { rec[k] = p.scores[k]; });

  let headers = sh.getLastRow() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0] : [];
  Object.keys(rec).forEach(function (k) { if (headers.indexOf(k) < 0) headers.push(k); });
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');

  const row = sh.getLastRow() + 1;
  const range = sh.getRange(row, 1, 1, headers.length);
  range.setNumberFormat('@'); // keep text like "21-30" from turning into dates
  range.setValues([headers.map(function (h) { return rec[h] === undefined ? '' : String(rec[h]); })]);
  return row - 1; // total responses so far
}

function esc_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function sendNotification_(p, total) {
  const name = (p.answers.A2 || 'Someone').trim() || 'Someone';
  const when = Utilities.formatDate(new Date(p.submittedAt), Session.getScriptTimeZone(), 'dd MMM yyyy, hh:mm a');
  const link = DASHBOARD_URL ? '<p><a href="' + esc_(DASHBOARD_URL) + '" style="background:#12355b;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Open dashboard</a></p>' : '';
  const html = '<div style="font-family:Arial,sans-serif;max-width:520px">' +
    '<h2 style="color:#12355b;margin-bottom:4px">New survey response</h2>' +
    '<p style="font-size:16px"><b>' + esc_(name) + '</b> has submitted your survey.</p>' +
    '<p style="color:#555">Time: ' + esc_(when) + '<br>Response #: <b>' + total + '</b> (total so far)<br>Reference: ' + esc_(p.id) + '</p>' +
    link +
    '<p style="color:#888;font-size:12px">View this person’s answers, graphs, tables and interpretations in your dashboard (admin.html → Responses).</p></div>';
  MailApp.sendEmail({
    to: OWNER_EMAIL,
    subject: name + ' submitted your survey (response #' + total + ')',
    htmlBody: html
  });
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
