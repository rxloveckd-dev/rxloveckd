/**
 * Love CKD — production store on a private Google Sheet (option B).
 *
 * The web app serves the Love CKD page itself (Index.html) and is deployed with
 *   Execute as: User accessing the web app, Who has access: Anyone with a Google account.
 * Every call runs as the signed-in Google user, so:
 *   1. the user must have edit access to this Sheet (share it only with clinic staff), and
 *   2. the user's email must be in the `users` tab with an active clinical role.
 * There is no public data endpoint. Every load and change is written to the `audit` tab.
 */

const TABLES = {
  patients: ['id', 'nationalId', 'hn', 'title', 'firstName', 'lastName', 'birthDate', 'sex', 'ckdCause', 'programStatus', 'enrolledAt', 'notes', 'dischargeCode', 'dischargeDate', 'dischargeNote'],
  visits: ['id', 'patientId', 'visitNo', 'visitDate', 'medicationTaking', 'herbalOrPainkiller', 'herbalDetail', 'dietControlled', 'seasoning', 'furtherAdjustments', 'nextAppointment', 'aceiArb', 'aceiArbNoReason', 'pharmacistId'],
  labs: ['id', 'patientId', 'visitId', 'test', 'value', 'unit', 'collectedAt', 'origin', 'source'],
  medications: ['id', 'patientId', 'visitId', 'drugName', 'strength', 'directions', 'drugClass', 'status', 'createdAt'],
  drps: ['id', 'patientId', 'visitId', 'recordedAt', 'category', 'description', 'drugs', 'severity', 'recommendation', 'prescriberDecision', 'prescriberReason', 'decidedById', 'pharmacistId'],
  users: ['email', 'displayName', 'role', 'active'],
  audit: ['at', 'email', 'action', 'entity', 'entityId', 'outcome'],
};
const DATA_TABLES = ['patients', 'visits', 'labs', 'medications', 'drps'];
const CLINICAL_ROLES = ['pharmacist', 'supervisor'];

/** Creates tabs and headers. Safe to run again; new columns are only ever appended. */
function setup() {
  const ss = SpreadsheetApp.getActive();
  Object.keys(TABLES).forEach(function (name) {
    const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    const cols = TABLES[name];
    sheet.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#ffe27a');
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, sheet.getMaxRows(), cols.length).setNumberFormat('@');
  });
  // The owner who runs setup becomes the first supervisor, so someone can always get in.
  const users = ss.getSheetByName('users');
  if (users.getLastRow() < 2) {
    const me = Session.getEffectiveUser().getEmail();
    users.appendRow([me, me, 'supervisor', 'TRUE']);
  }
  ['users', 'audit'].forEach(function (name) {
    const s = ss.getSheetByName(name);
    if (!s.getProtections(SpreadsheetApp.ProtectionType.SHEET).length) {
      s.protect().setDescription(name + ' แก้ไขได้เฉพาะเจ้าของไฟล์').setWarningOnly(true);
    }
  });
  const first = ss.getSheetByName('Sheet1') || ss.getSheetByName('แผ่น1');
  if (first && ss.getSheets().length > 1) ss.deleteSheet(first);
}

function ensureSetup() {
  const ss = SpreadsheetApp.getActive();
  const outdated = Object.keys(TABLES).some(function (name) {
    const sheet = ss.getSheetByName(name);
    if (!sheet) return true;
    const cols = TABLES[name];
    return sheet.getRange(1, 1, 1, cols.length).getDisplayValues()[0].join('|') !== cols.join('|');
  });
  if (outdated) setup();
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

function audit(email, action, entity, entityId, outcome) {
  SpreadsheetApp.getActive()
    .getSheetByName('audit')
    .appendRow([new Date().toISOString(), email || '', action, entity, entityId || '', outcome || 'ok']);
}

/** The signed-in Google user, checked against the `users` tab. Throws a Thai message if not allowed. */
function requireUser(clinicalOnly) {
  ensureSetup();
  const email = (Session.getActiveUser().getEmail() || '').toLowerCase();
  if (!email) throw new Error('ไม่สามารถระบุบัญชี Google ได้ กรุณาเข้าสู่ระบบ Google แล้วลองใหม่');
  const user = readTable('users').find(function (u) {
    return u.email.toLowerCase() === email && String(u.active).toUpperCase() !== 'FALSE';
  });
  if (!user) {
    audit(email, 'denied', 'app', '', 'denied');
    throw new Error('บัญชี ' + email + ' ยังไม่มีสิทธิ์ใช้งาน กรุณาติดต่อหัวหน้าเภสัชกร');
  }
  if (clinicalOnly && CLINICAL_ROLES.indexOf(user.role) < 0) {
    audit(email, 'denied', 'patient_data', '', 'denied');
    throw new Error('บัญชีนี้ไม่มีสิทธิ์ดูข้อมูลผู้ป่วย');
  }
  return { id: email, username: email, displayName: user.displayName || email, role: user.role };
}

// ---------------------------------------------------------------- web app

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Love CKD คลินิกรักษ์ไต')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Called by the page on start: who am I? */
function whoami() {
  return requireUser(false);
}

/** All clinical data plus staff names (for "recorded by"). */
function loadAll() {
  const user = requireUser(true);
  const out = {};
  DATA_TABLES.forEach(function (name) { out[name] = readTable(name); });
  out.users = readTable('users').map(function (u) {
    return { id: u.email, username: u.email, displayName: u.displayName || u.email, role: u.role };
  });
  audit(user.id, 'view', 'all', '', 'ok');
  return out;
}

function toCells(name, row) {
  return TABLES[name].map(function (c) {
    const v = row[c];
    return v === null || v === undefined ? '' : String(v);
  });
}

/** ops: [{ type: 'insert' | 'update', table, row }] — applied under a lock and audited. */
function writeOps(ops) {
  const user = requireUser(true);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.getActive();
    const inserts = {};
    (ops || []).forEach(function (op) {
      if (DATA_TABLES.indexOf(op.table) < 0) throw new Error('ตารางไม่ถูกต้อง');
      if (op.type === 'insert') {
        (inserts[op.table] = inserts[op.table] || []).push(toCells(op.table, op.row));
      } else if (op.type === 'update') {
        const sheet = ss.getSheetByName(op.table);
        const ids = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 1).getDisplayValues();
        const idx = ids.findIndex(function (r) { return r[0] === op.row.id; });
        if (idx < 0) throw new Error('ไม่พบข้อมูลที่จะแก้ไข');
        sheet.getRange(idx + 2, 1, 1, TABLES[op.table].length).setValues([toCells(op.table, op.row)]);
      }
    });
    Object.keys(inserts).forEach(function (name) {
      const sheet = ss.getSheetByName(name);
      const rows = inserts[name];
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, TABLES[name].length).setNumberFormat('@').setValues(rows);
    });
    (ops || []).forEach(function (op) { audit(user.id, op.type === 'insert' ? 'create' : 'update', op.table, op.row.id, 'ok'); });
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}
