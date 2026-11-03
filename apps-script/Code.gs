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
  visits: ['id', 'patientId', 'visitNo', 'visitDate', 'medicationTaking', 'herbalOrPainkiller', 'herbalDetail', 'dietControlled', 'seasoning', 'furtherAdjustments', 'nextAppointment', 'aceiArb', 'aceiArbNoReason', 'pharmacistId',
    // added later: new columns only ever go at the end so existing rows stay aligned
    'medicationTakingDetail', 'leftoverMeds', 'dietDetail', 'seasoningDetail', 'aceiArbDrug'],
  labs: ['id', 'patientId', 'visitId', 'test', 'value', 'unit', 'collectedAt', 'origin', 'source'],
  medications: ['id', 'patientId', 'visitId', 'drugName', 'strength', 'directions', 'drugClass', 'status', 'createdAt'],
  drps: ['id', 'patientId', 'visitId', 'recordedAt', 'category', 'description', 'drugs', 'severity', 'recommendation', 'prescriberDecision', 'prescriberReason', 'decidedById', 'pharmacistId'],
  // username/passwordHash/passwordSalt: optional personal sign-in (hash only, never the password).
  users: ['email', 'displayName', 'role', 'active', 'username', 'passwordHash', 'passwordSalt'],
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
  // The Sheet's owner becomes the first supervisor, so someone can always get in. (Not the person
  // running this: with "execute as user accessing" that could be any staff member who opens it first.)
  const users = ss.getSheetByName('users');
  if (users.getLastRow() < 2) {
    const owner = ss.getOwner();
    if (owner) users.appendRow([owner.getEmail(), owner.getName() || owner.getEmail(), 'supervisor', 'TRUE']);
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

// ---------------------------------------------------------------- app sign-in (second factor)
// The clinic's shared username/password is stored only as a salted SHA-256 hash in Script
// Properties (never in the page or the repository). It is set once from the app by a supervisor.
const SESSION_HOURS = 8;
const MAX_FAILS = 5;
const LOCK_MINUTES = 15;

function hash(text, salt) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + '|' + text, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); })
    .join('');
}

function loginConfigured() {
  return !!PropertiesService.getScriptProperties().getProperty('LOGIN_HASH');
}

function hasSession() {
  const until = Number(PropertiesService.getUserProperties().getProperty('SESSION_UNTIL') || 0);
  return until > Date.now();
}

function startSession() {
  PropertiesService.getUserProperties().setProperty('SESSION_UNTIL', String(Date.now() + SESSION_HOURS * 3600 * 1000));
}

/** First run only: a supervisor sets the username and password. */
function setLogin(username, password) {
  const user = requireAllowedEmail();
  if (user.role !== 'supervisor') throw new Error('เฉพาะเภสัชคลินิกที่ตั้งรหัสผ่านได้');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (loginConfigured()) throw new Error('ตั้งรหัสผ่านไว้แล้ว');
    if (!username || String(password || '').length < 4) throw new Error('กรุณาระบุชื่อผู้ใช้ และรหัสผ่านอย่างน้อย 4 ตัว');
    const salt = Utilities.getUuid();
    PropertiesService.getScriptProperties().setProperties({
      LOGIN_SALT: salt,
      LOGIN_HASH: hash(String(username).trim().toLowerCase() + '\n' + password, salt),
    });
  } finally {
    lock.releaseLock();
  }
  audit(user.id, 'update', 'login_settings', '', 'ok');
  startSession();
  return whoami();
}

function login(username, password) {
  const user = requireAllowedEmail();
  const cache = CacheService.getScriptCache();
  const key = 'fails:' + user.id;
  const fails = Number(cache.get(key) || 0);
  if (fails >= MAX_FAILS) throw new Error('ใส่รหัสผ่านผิดหลายครั้ง กรุณารอ ' + LOCK_MINUTES + ' นาทีแล้วลองใหม่');
  // A personal username/password (set by a supervisor) replaces the shared clinic login for that person.
  const row = userRow(user.id);
  const name = String(username || '').trim().toLowerCase();
  let ok;
  if (row && row.passwordHash) {
    ok = name === String(row.username).trim().toLowerCase() && hash(password || '', row.passwordSalt) === row.passwordHash;
  } else {
    const props = PropertiesService.getScriptProperties();
    ok = props.getProperty('LOGIN_HASH') === hash(name + '\n' + (password || ''), props.getProperty('LOGIN_SALT') || '');
  }
  if (!ok) {
    cache.put(key, String(fails + 1), LOCK_MINUTES * 60);
    audit(user.id, 'login', 'app', '', 'denied');
    throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  }
  cache.remove(key);
  startSession();
  audit(user.id, 'login', 'app', '', 'ok');
  return whoami();
}

function logout() {
  PropertiesService.getUserProperties().deleteProperty('SESSION_UNTIL');
  return { ok: true };
}

/** The users-tab row for an email (trimmed, case-insensitive), or undefined. */
function userRow(email) {
  return readTable('users').find(function (u) { return String(u.email).trim().toLowerCase() === email; });
}

/** The signed-in Google user if listed in the `users` tab (no app password check). */
function requireAllowedEmail() {
  ensureSetup();
  const email = (Session.getActiveUser().getEmail() || '').toLowerCase();
  if (!email) throw new Error('ไม่สามารถระบุบัญชี Google ได้ กรุณาเข้าสู่ระบบ Google แล้วลองใหม่');
  const user = readTable('users').find(function (u) {
    // Trim: a stray space typed in the users tab must not lock a person out.
    return String(u.email).trim().toLowerCase() === email && String(u.active).trim().toUpperCase() !== 'FALSE';
  });
  if (!user) {
    audit(email, 'denied', 'app', '', 'denied');
    throw new Error('บัญชี ' + email + ' ยังไม่มีสิทธิ์ใช้งาน กรุณาติดต่อเภสัชคลินิก');
  }
  return { id: email, username: email, displayName: String(user.displayName || email).trim(), role: String(user.role).trim() };
}

/** Allowed Google account AND a valid app sign-in; clinicalOnly also requires a clinical role. */
function requireUser(clinicalOnly) {
  const user = requireAllowedEmail();
  if (!hasSession()) throw new Error('กรุณาเข้าสู่ระบบ');
  if (clinicalOnly && CLINICAL_ROLES.indexOf(user.role) < 0) {
    audit(user.id, 'denied', 'patient_data', '', 'denied');
    throw new Error('บัญชีนี้ไม่มีสิทธิ์ดูข้อมูลผู้ป่วย');
  }
  return user;
}

// ---------------------------------------------------------------- user management (supervisors)

const ROLES = ['pharmacist', 'supervisor', 'admin'];

function requireSupervisor() {
  const user = requireUser(false);
  if (user.role !== 'supervisor') throw new Error('เฉพาะเภสัชคลินิกที่จัดการผู้ใช้ได้');
  return user;
}

function listUsers() {
  requireSupervisor();
  return readTable('users').map(function (u) {
    return {
      email: String(u.email).trim().toLowerCase(),
      displayName: String(u.displayName || '').trim(),
      role: String(u.role).trim(),
      active: String(u.active).trim().toUpperCase() !== 'FALSE',
      username: String(u.username || '').trim(),
      hasPassword: !!u.passwordHash,
    };
  });
}

/**
 * Adds or updates one user. Active users are also given edit access to this Sheet (needed because
 * the app runs as each signed-in user); suspended users have that access removed.
 */
function saveUser(input) {
  const me = requireSupervisor();
  const email = String((input && input.email) || '').trim().toLowerCase();
  const displayName = String((input && input.displayName) || '').trim() || email;
  const role = String((input && input.role) || '').trim();
  const active = !!(input && input.active);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('อีเมลไม่ถูกต้อง');
  if (ROLES.indexOf(role) < 0) throw new Error('สิทธิ์ไม่ถูกต้อง');
  if (email === me.id && (!active || role !== 'supervisor')) throw new Error('ไม่สามารถลดสิทธิ์หรือระงับบัญชีของตัวเองได้');
  const username = String((input && input.username) || '').trim().toLowerCase();
  const password = String((input && input.password) || '');
  if (password && !username) throw new Error('กรุณาระบุชื่อผู้ใช้สำหรับเข้าระบบ');
  if (password && password.length < 6) throw new Error('รหัสผ่านต้องมีอย่างน้อย 6 ตัว');
  if (username && !/^[a-z0-9._-]{3,30}$/.test(username)) throw new Error('ชื่อผู้ใช้ใช้ได้เฉพาะ a-z 0-9 . _ - ยาว 3–30 ตัว');

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let shareNote = '';
  try {
    const ss = SpreadsheetApp.getActive();
    const sheet = ss.getSheetByName('users');
    const width = TABLES.users.length;
    const existing = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, width).getDisplayValues() : [];
    const idx = existing.findIndex(function (r) { return String(r[0]).trim().toLowerCase() === email; });
    if (username && existing.some(function (r, i) { return i !== idx && String(r[4]).trim().toLowerCase() === username; })) {
      throw new Error('ชื่อผู้ใช้ ' + username + ' มีคนใช้แล้ว');
    }
    const old = idx >= 0 ? existing[idx] : ['', '', '', '', '', '', ''];
    let passwordHash = old[5];
    let passwordSalt = old[6];
    if (password) {
      passwordSalt = Utilities.getUuid();
      passwordHash = hash(password, passwordSalt);
    }
    const row = [email, displayName, role, active ? 'TRUE' : 'FALSE', username || old[4], passwordHash, passwordSalt];
    const target = idx >= 0 ? idx + 2 : sheet.getLastRow() + 1;
    sheet.getRange(target, 1, 1, width).setNumberFormat('@').setValues([row]);

    try {
      if (active) ss.addEditor(email);
      else if (ss.getEditors().some(function (u) { return u.getEmail().toLowerCase() === email; })) ss.removeEditor(email);
    } catch (e) {
      shareNote = active
        ? 'บันทึกผู้ใช้แล้ว แต่แชร์ Sheet ให้อัตโนมัติไม่สำเร็จ กรุณากดแชร์ Sheet ให้ ' + email + ' เป็นผู้แก้ไขเอง'
        : 'ระงับผู้ใช้แล้ว แต่ยกเลิกการแชร์ Sheet อัตโนมัติไม่สำเร็จ กรุณานำ ' + email + ' ออกจากการแชร์เอง';
    }
  } finally {
    lock.releaseLock();
  }
  audit(me.id, active ? (password ? 'set_password' : 'update') : 'deactivate', 'user', email, 'ok');
  return { users: listUsers(), note: shareNote };
}

/**
 * Removes a user from the users tab and their Sheet sharing. Their past records keep their email,
 * so "recorded by" history is unchanged.
 */
function deleteUser(email) {
  const me = requireSupervisor();
  const target = String(email || '').trim().toLowerCase();
  if (!target) throw new Error('ไม่พบผู้ใช้');
  if (target === me.id) throw new Error('ไม่สามารถลบบัญชีของตัวเองได้');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let shareNote = '';
  try {
    const ss = SpreadsheetApp.getActive();
    const sheet = ss.getSheetByName('users');
    const emails = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues() : [];
    const idx = emails.findIndex(function (r) { return String(r[0]).trim().toLowerCase() === target; });
    if (idx < 0) throw new Error('ไม่พบผู้ใช้');
    sheet.deleteRow(idx + 2);
    try {
      if (ss.getEditors().some(function (u) { return u.getEmail().toLowerCase() === target; })) ss.removeEditor(target);
    } catch (e) {
      shareNote = 'ลบผู้ใช้แล้ว แต่ยกเลิกการแชร์ Sheet อัตโนมัติไม่สำเร็จ กรุณานำ ' + target + ' ออกจากการแชร์เอง';
    }
  } finally {
    lock.releaseLock();
  }
  audit(me.id, 'delete', 'user', target, 'ok');
  return { users: listUsers(), note: shareNote };
}

/** Change the clinic username/password; the current username and password are required. */
function changeLogin(currentUsername, currentPassword, newUsername, newPassword) {
  const me = requireSupervisor();
  const props = PropertiesService.getScriptProperties();
  const currentHash = hash(String(currentUsername || '').trim().toLowerCase() + '\n' + (currentPassword || ''), props.getProperty('LOGIN_SALT') || '');
  if (currentHash !== props.getProperty('LOGIN_HASH')) {
    audit(me.id, 'update', 'login_settings', '', 'denied');
    throw new Error('ชื่อผู้ใช้หรือรหัสผ่านปัจจุบันไม่ถูกต้อง');
  }
  const user = String(newUsername || '').trim().toLowerCase();
  if (!user || String(newPassword || '').length < 4) throw new Error('กรุณาระบุชื่อผู้ใช้ และรหัสผ่านอย่างน้อย 4 ตัว');
  const salt = Utilities.getUuid();
  props.setProperties({ LOGIN_SALT: salt, LOGIN_HASH: hash(user + '\n' + newPassword, salt) });
  audit(me.id, 'update', 'login_settings', '', 'ok');
  return { ok: true };
}

// ---------------------------------------------------------------- one-off maintenance

/**
 * Run once from the Apps Script editor (select clearDemoData, press Run) before real use.
 * Removes only the synthetic trial patients (notes = DEMO_NOTE) and every visit, lab, medication
 * and DRP that belongs to them. Real records, the users tab and the audit tab are kept.
 */
const DEMO_NOTE = 'ข้อมูลสมมติสำหรับทดลองระบบ';

function clearDemoData() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const ss = SpreadsheetApp.getActive();
    const demoIds = {};
    readTable('patients').forEach(function (p) {
      if (String(p.notes).trim() === DEMO_NOTE) demoIds[p.id] = true;
    });
    const removed = {};
    DATA_TABLES.forEach(function (name) {
      const key = name === 'patients' ? 'id' : 'patientId';
      const rows = readTable(name);
      const keep = rows.filter(function (r) { return !demoIds[r[key]]; });
      removed[name] = rows.length - keep.length;
      const sheet = ss.getSheetByName(name);
      if (sheet.getLastRow() > 1) sheet.deleteRows(2, sheet.getLastRow() - 1);
      if (keep.length) {
        sheet
          .getRange(2, 1, keep.length, TABLES[name].length)
          .setNumberFormat('@')
          .setValues(keep.map(function (r) { return toCells(name, r); }));
      }
    });
    const who = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail();
    audit(who, 'delete', 'demo_data', JSON.stringify(removed), 'ok');
    Logger.log('ลบข้อมูลสมมติแล้ว: ' + JSON.stringify(removed));
    return removed;
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------- web app

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Love CKD คลินิกรักษ์ไต')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Called by the page on start: the Google user plus whether the app sign-in is set up and active. */
function whoami() {
  const user = requireAllowedEmail();
  return { user: user, loginConfigured: loginConfigured(), signedIn: hasSession() };
}

/** All clinical data plus staff names (for "recorded by"). */
function loadAll() {
  const user = requireUser(true);
  const out = {};
  DATA_TABLES.forEach(function (name) { out[name] = readTable(name); });
  out.users = readTable('users').map(function (u) {
    const mail = String(u.email).trim().toLowerCase();
    return { id: mail, username: mail, displayName: String(u.displayName || mail).trim(), role: String(u.role).trim() };
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

/** ops: [{ type: 'insert' | 'update' | 'delete', table, row }] — applied under a lock and audited. */
function writeOps(ops) {
  const user = requireUser(true);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.getActive();
    const inserts = {};
    const deletes = {};
    (ops || []).forEach(function (op) {
      if (op.type === 'delete') {
        if (DATA_TABLES.indexOf(op.table) < 0) throw new Error('ตารางไม่ถูกต้อง');
        if (op.table === 'patients' && user.role !== 'supervisor') {
          audit(user.id, 'denied', 'patients', op.row.id, 'denied');
          throw new Error('เฉพาะเภสัชคลินิกที่ลบผู้ป่วยได้');
        }
        (deletes[op.table] = deletes[op.table] || {})[op.row.id] = true;
        return;
      }
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
    // Delete bottom-up so the row numbers still to be deleted stay valid.
    Object.keys(deletes).forEach(function (name) {
      const sheet = ss.getSheetByName(name);
      if (sheet.getLastRow() < 2) return;
      const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues();
      for (let i = ids.length - 1; i >= 0; i--) {
        if (deletes[name][ids[i][0]]) sheet.deleteRow(i + 2);
      }
    });
    Object.keys(inserts).forEach(function (name) {
      const sheet = ss.getSheetByName(name);
      const rows = inserts[name];
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, TABLES[name].length).setNumberFormat('@').setValues(rows);
    });
    (ops || []).forEach(function (op) {
      const action = op.type === 'insert' ? 'create' : op.type === 'delete' ? 'delete' : 'update';
      audit(user.id, action, op.table, op.row.id, 'ok');
    });
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}
