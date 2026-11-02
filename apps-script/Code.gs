/**
 * Love CKD — Google Sheets store for the online TRIAL (synthetic data only).
 *
 * Paste into the Sheet: Extensions > Apps Script, replace Code.gs, Save, run setup() once,
 * then Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 *
 * The web app URL is public (it is embedded in the public demo page), so anyone with it can read
 * and write this Sheet. Never put real patient data here.
 */

const TABLES = {
  patients: ['id', 'nationalId', 'hn', 'title', 'firstName', 'lastName', 'birthDate', 'sex', 'ckdCause', 'programStatus', 'enrolledAt', 'notes'],
  visits: ['id', 'patientId', 'visitNo', 'visitDate', 'medicationTaking', 'herbalOrPainkiller', 'herbalDetail', 'dietControlled', 'seasoning', 'furtherAdjustments', 'nextAppointment', 'aceiArb', 'aceiArbNoReason', 'pharmacistId'],
  labs: ['id', 'patientId', 'visitId', 'test', 'value', 'unit', 'collectedAt', 'origin', 'source'],
  medications: ['id', 'patientId', 'visitId', 'drugName', 'strength', 'directions', 'drugClass', 'status', 'createdAt'],
  drps: ['id', 'patientId', 'visitId', 'recordedAt', 'category', 'description', 'drugs', 'severity', 'recommendation', 'prescriberDecision', 'prescriberReason', 'decidedById', 'pharmacistId'],
};

/** Creates one tab per table with a header row. Safe to run again. */
function setup() {
  const ss = SpreadsheetApp.getActive();
  Object.keys(TABLES).forEach(function (name) {
    const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    const cols = TABLES[name];
    sheet.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#ffe27a');
    sheet.setFrozenRows(1);
    // Store everything as text so IDs, HN and national IDs keep leading zeros and dates stay ISO.
    sheet.getRange(1, 1, sheet.getMaxRows(), cols.length).setNumberFormat('@');
  });
  const first = ss.getSheetByName('Sheet1') || ss.getSheetByName('แผ่น1');
  if (first && ss.getSheets().length > 1) ss.deleteSheet(first);
}

function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function readTable(name) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const cols = TABLES[name];
  return sheet
    .getRange(2, 1, sheet.getLastRow() - 1, cols.length)
    .getDisplayValues()
    .filter(function (r) { return r[0] !== ''; })
    .map(function (r) {
      const o = {};
      cols.forEach(function (c, i) { o[c] = r[i]; });
      return o;
    });
}

function doGet() {
  const out = {};
  Object.keys(TABLES).forEach(function (name) { out[name] = readTable(name); });
  return json({ ok: true, data: out });
}

function toCells(name, row) {
  return TABLES[name].map(function (c) {
    const v = row[c];
    return v === null || v === undefined ? '' : String(v);
  });
}

/** Body: { ops: [{ type: 'insert' | 'update', table, row }] } or { reset: true }. */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const body = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActive();

    if (body.reset) {
      Object.keys(TABLES).forEach(function (name) {
        const sheet = ss.getSheetByName(name);
        if (sheet && sheet.getLastRow() > 1) sheet.deleteRows(2, sheet.getLastRow() - 1);
      });
      return json({ ok: true });
    }

    const inserts = {};
    (body.ops || []).forEach(function (op) {
      if (!TABLES[op.table]) throw new Error('unknown table ' + op.table);
      if (op.type === 'insert') {
        (inserts[op.table] = inserts[op.table] || []).push(toCells(op.table, op.row));
      } else if (op.type === 'update') {
        const sheet = ss.getSheetByName(op.table);
        const ids = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 1).getDisplayValues();
        const idx = ids.findIndex(function (r) { return r[0] === op.row.id; });
        if (idx < 0) throw new Error('not found ' + op.row.id);
        sheet.getRange(idx + 2, 1, 1, TABLES[op.table].length).setValues([toCells(op.table, op.row)]);
      }
    });
    Object.keys(inserts).forEach(function (name) {
      const sheet = ss.getSheetByName(name);
      const rows = inserts[name];
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, TABLES[name].length).setNumberFormat('@').setValues(rows);
    });
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
