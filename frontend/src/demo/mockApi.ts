/**
 * Static demo (GitHub Pages): answers the same /api contract inside the browser with synthetic
 * data, using the same shared domain rules as the server. Nothing leaves the browser; data is kept
 * in this browser's localStorage only.
 */
import {
  aceiArbCoverage,
  DEFAULT_RULES,
  seePharmacistToday,
  urgencyRank,
  lastMonths,
  derivePatientStatus,
  dischargeSchema,
  drpCreateSchema,
  drpDecisionSchema,
  drpUpdateSchema,
  labCreateSchema,
  labUpdateSchema,
  labHistory,
  loginSchema,
  maskNationalId,
  medicationCreateSchema,
  medicationUpdateSchema,
  monthRange,
  patientCreateSchema,
  patientUpdateSchema,
  summarizeMonth,
  visitCreateSchema,
  visitUpdateSchema,
  type PatientSummary,
  type SessionUser,
} from '@rx/shared';
import { z, ZodError } from 'zod';

interface Store {
  users: (SessionUser & { password: string; active?: boolean })[];
  session: string | null;
  patients: { id: string; nationalId: string; hn: string; title: string; firstName: string; lastName: string; birthDate: string; sex: 'male' | 'female'; ckdCause: string | null; programStatus: string; enrolledAt: string; notes: string | null; dischargeCode?: string | null; dischargeDate?: string | null; dischargeNote?: string | null }[];
  labs: { id: string; patientId: string; visitId: string | null; test: string; value: number; valueText?: string | null; unit: string; collectedAt: string; origin: string; source: string }[];
  visits: { id: string; patientId: string; visitNo: number; visitDate: string; medicationTaking: string; herbalOrPainkiller: boolean; herbalDetail: string | null; dietControlled: boolean; seasoning: string; furtherAdjustments: string | null; nextAppointment: string | null; aceiArb: string | null; aceiArbNoReason: string | null; pharmacistId: string; medicationTakingDetail?: string | null; leftoverMeds?: string | null; dietDetail?: string | null; seasoningDetail?: string | null; aceiArbDrug?: string | null; doctorMedChange?: string | null; doctorMedChangeDetail?: string | null; urgencyColor?: string | null; nextSeePharmacist?: string | null }[];
  medications: { id: string; patientId: string; visitId: string | null; drugName: string; strength: string | null; directions: string | null; drugClass: string; status: string; createdAt: string }[];
  drps: { id: string; patientId: string; visitId: string | null; recordedAt: string; category: string; description: string; drugs: string | null; severity: string; recommendation: string; prescriberDecision: string; prescriberReason: string | null; decidedById: string | null; pharmacistId: string }[];
}

export class MockHttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public field?: string,
  ) {
    super(message);
  }
}

const KEY = 'loveckd-static-demo-v4'; // v4: pharmacist-chosen urgency color
const SESSION_KEY = 'loveckd-static-demo-session';
/** Apps Script web app (apps-script/Code.gs). When set, data lives in the Google Sheet, not the browser. */
const SHEETS_URL: string = import.meta.env.VITE_SHEETS_API_URL ?? '';
export const USES_SHEETS = SHEETS_URL !== '';
/** Private clinic web app: data and identity come from Google Apps Script via google.script.run. */
export const GAS = import.meta.env.VITE_GAS === 'true';
const REMOTE = USES_SHEETS || GAS;

type GasRunner = Record<string, (...args: unknown[]) => void> & {
  withSuccessHandler: (f: (v: unknown) => void) => GasRunner;
  withFailureHandler: (f: (e: Error) => void) => GasRunner;
};

/** Promise wrapper for google.script.run; server errors carry Thai messages from Code.gs. */
function gasCall<T>(fn: string, ...args: unknown[]): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = (window as unknown as { google?: { script?: { run?: GasRunner } } }).google?.script?.run;
    if (!run) {
      reject(new MockHttpError(502, 'เปิดหน้านี้จากลิงก์ของคลินิกเท่านั้น'));
      return;
    }
    run
      .withSuccessHandler((v) => resolve(v as T))
      .withFailureHandler((e) => reject(new MockHttpError(403, e?.message ?? 'เชื่อมต่อระบบไม่สำเร็จ')))
      [fn]!(...args);
  });
}
const DAY = 86_400_000;
const rules = DEFAULT_RULES;
let seq = 0;
const newId = () => `d${Date.now().toString(36)}${(seq++).toString(36)}`;

// ---------------------------------------------------------------- synthetic seed
function seed(): Store {
  let state = 20261102;
  const rand = () => (state = (state * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!;
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const day = (n: number) => new Date(today + n * DAY).toISOString();
  const nid = (n: number) => {
    const base = `8${String(990000000 + n).padStart(11, '0')}`.slice(0, 12);
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += Number(base[i]) * (13 - i);
    return base + ((11 - (sum % 11)) % 10);
  };
  const FIRST_M = ['สมชาย', 'ประเสริฐ', 'บุญมี', 'สุชาติ', 'วิชัย', 'อำนาจ', 'สมศักดิ์', 'ทองดี', 'มานพ', 'ชาตรี'];
  const FIRST_F = ['สมศรี', 'มาลี', 'บุญเรือน', 'ประไพ', 'สุดา', 'วันเพ็ญ', 'จันทร์เพ็ญ', 'ละเอียด', 'นวลจันทร์', 'สายใจ'];
  const LAST = ['ใจดี', 'มีสุข', 'ทองคำ', 'ศรีสุข', 'แก้วมณี', 'บุญมา', 'สายทอง', 'พึ่งบุญ', 'รักไทย', 'เขาชัย', 'นาคสวัสดิ์', 'ดวงแก้ว'];
  const PROFILES: [number, number, number, boolean, boolean][] = [
    [92, 95, 30, false, false], [75, 72, 25, false, false], [64, 61, 40, false, false], [55, 52, 5, false, false],
    [50, 47, 20, true, false], [42, 40, 3, false, true], [38, 36, 45, false, false], [44, 31, -6, false, false],
    [33, 30, 12, true, true], [28, 26, 14, false, false], [22, 18, 2, false, false], [16, 12, 9, false, false],
    [58, 41, 21, false, false], [70, 66, -15, false, false],
  ];
  const s: Store = {
    users: [
      { id: 'u1', username: 'pharm1', displayName: 'ภก.สมหมาย ดูแลไต', role: 'pharmacist', password: 'demo1234' },
      { id: 'u2', username: 'pharm2', displayName: 'ภญ.วรรณา รักษ์ไต', role: 'pharmacist', password: 'demo1234' },
      { id: 'u3', username: 'super1', displayName: 'ภญ.วิไล เขาชัยสน', role: 'supervisor', password: 'demo1234' },
      { id: 'u4', username: 'admin1', displayName: 'ผู้ดูแลระบบ', role: 'admin', password: 'demo1234' },
    ],
    session: null,
    patients: [],
    labs: [],
    visits: [],
    medications: [],
    drps: [],
  };
  for (let i = 0; i < 30; i++) {
    const [prevGfr, gfr, appt, incorrect, herbal] = PROFILES[i % PROFILES.length]!;
    const sex = rand() < 0.5 ? 'male' : 'female';
    const ph = pick(['u1', 'u2']);
    const pid = `p${i + 1}`;
    s.patients.push({
      id: pid,
      nationalId: nid(i + 1),
      hn: String(650001 + i).padStart(9, '0'),
      title: sex === 'male' ? 'นาย' : pick(['นาง', 'นางสาว']),
      firstName: pick(sex === 'male' ? FIRST_M : FIRST_F),
      lastName: pick(LAST),
      birthDate: new Date(Date.UTC(1940 + Math.floor(rand() * 35), Math.floor(rand() * 12), 1 + Math.floor(rand() * 27))).toISOString(),
      sex,
      ckdCause: pick(['เบาหวาน', 'ความดัน', 'เบาหวาน, ความดัน', 'เบาหวาน, ความดัน, ไขมันในเลือด', null]),
      programStatus: 'active',
      enrolledAt: day(-200 + i * 5),
      notes: 'ข้อมูลสมมติสำหรับทดลองระบบ',
    });
    const v1 = { id: `v${i}a`, date: day(-120 + (i % 7)) };
    const v2 = { id: `v${i}b`, date: day(-40 + (i % 9)) };
    const noAcei = i % 6 === 5;
    s.visits.push(
      { id: v1.id, patientId: pid, visitNo: 1, visitDate: v1.date, medicationTaking: 'correct', herbalOrPainkiller: false, herbalDetail: null, dietControlled: rand() < 0.6, seasoning: 'reduce_needed', furtherAdjustments: 'ลดเค็ม ทบทวนการกินยา', nextAppointment: v2.date, nextSeePharmacist: 'yes', aceiArb: 'yes', aceiArbDrug: i % 2 ? 'losartan' : 'enalapril', aceiArbNoReason: null, pharmacistId: ph },
      { id: v2.id, patientId: pid, visitNo: 2, visitDate: v2.date, medicationTaking: incorrect ? 'incorrect' : 'correct', herbalOrPainkiller: herbal, herbalDetail: herbal ? 'ยาแก้ปวดกลุ่ม NSAID ซื้อจากร้านขายยา' : null, dietControlled: rand() < 0.7, seasoning: rand() < 0.5 ? 'adjusted' : 'reduce_needed', furtherAdjustments: incorrect ? 'สอนวิธีกินยาความดันใหม่' : null, nextAppointment: day(appt), nextSeePharmacist: i % 3 === 0 ? 'no' : 'yes', urgencyColor: ['red', 'orange', 'yellow', null, null][i % 5], aceiArb: noAcei ? 'no' : 'yes', aceiArbDrug: noAcei ? null : i % 2 ? 'losartan' : 'enalapril', aceiArbNoReason: noAcei ? 'โพแทสเซียมสูง แพทย์หยุดยาไว้ก่อน' : null, pharmacistId: ph },
    );
    for (const [vid, vdate, g] of [[v1.id, v1.date, prevGfr], [v2.id, v2.date, gfr]] as const) {
      const at = new Date(new Date(vdate).getTime() - 3 * DAY).toISOString();
      const lab = (test: string, value: number, unit: string) =>
        s.labs.push({ id: newId(), patientId: pid, visitId: vid, test, value, unit, collectedAt: at, origin: 'user_entered', source: 'บันทึกเอง' });
      lab('gfr', g, 'mL/min/1.73m²');
      lab('hba1c', Math.round((5.6 + rand() * 4) * 10) / 10, '%');
      lab('albumin', Math.round(20 + rand() * 300), 'mg/g');
      lab('potassium', Math.round((3.8 + rand() * (g < 20 ? 2.2 : 1.2)) * 10) / 10, 'mmol/L');
      lab('sbp', Math.round(118 + rand() * 40), 'mmHg');
      lab('dbp', Math.round(70 + rand() * 20), 'mmHg');
    }
    s.medications.push(
      { id: newId(), patientId: pid, visitId: v1.id, drugName: pick(['Enalapril', 'Losartan']), strength: pick(['5 mg', '50 mg']), directions: '1 เม็ด เช้า', drugClass: rand() < 0.5 ? 'acei' : 'arb', status: 'active', createdAt: v1.date },
      { id: newId(), patientId: pid, visitId: v1.id, drugName: 'Amlodipine', strength: '5 mg', directions: '1 เม็ด เช้า', drugClass: 'other_antihypertensive', status: 'active', createdAt: v1.date },
    );
    if (herbal) {
      s.drps.push({ id: newId(), patientId: pid, visitId: v2.id, recordedAt: v2.date, category: 'avoid_in_ckd', description: 'ผู้ป่วยซื้อยาแก้ปวดกลุ่ม NSAID กินเอง', drugs: 'Ibuprofen', severity: 'medium', recommendation: 'แนะนำหยุด NSAID ใช้ paracetamol แทน และแจ้งแพทย์', prescriberDecision: 'pending', prescriberReason: null, decidedById: null, pharmacistId: ph });
    }
  }
  return s;
}

// ---------------------------------------------------------------- persistence
type Table = 'patients' | 'visits' | 'labs' | 'medications' | 'drps';
const TABLES: Table[] = ['patients', 'visits', 'labs', 'medications', 'drps'];
type Op = { type: 'insert' | 'update' | 'delete'; table: Table; row: { id: string } };
let pending: Op[] = [];

function readSession(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function load(): Store {
  const s = seed();
  s.session = readSession();
  if (GAS) return { users: [], session: null, patients: [], visits: [], labs: [], medications: [], drps: [] };
  if (USES_SHEETS) return { ...s, patients: [], visits: [], labs: [], medications: [], drps: [] };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...(JSON.parse(raw) as Store), session: s.session };
  } catch {
    /* storage unavailable: fall back to a fresh in-memory demo */
  }
  return s;
}
let store = load();
let loaded = !REMOTE;

function save() {
  try {
    if (store.session) localStorage.setItem(SESSION_KEY, store.session);
    else localStorage.removeItem(SESSION_KEY);
    if (!REMOTE) localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* demo still works for this tab without persistence */
  }
}

/** Every value comes back from the Sheet as text; restore numbers, booleans and empty values. */
const NUMBERS: Partial<Record<Table, string[]>> = { labs: ['value'], visits: ['visitNo'] };
const BOOLEANS: Partial<Record<Table, string[]>> = { visits: ['herbalOrPainkiller', 'dietControlled'] };
function fromSheet(table: Table, row: Record<string, string>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (NUMBERS[table]?.includes(k)) out[k] = Number(v);
    else if (BOOLEANS[table]?.includes(k)) out[k] = v.toUpperCase() === 'TRUE';
    else out[k] = v === '' ? null : v;
  }
  return out;
}

async function sheetsPost(payload: { ops?: Op[]; reset?: boolean }) {
  if (GAS) {
    await gasCall('writeOps', payload.ops ?? []);
    return;
  }
  // text/plain keeps this a "simple" request, so the browser sends no CORS preflight to Apps Script.
  const res = await fetch(SHEETS_URL, { method: 'POST', body: JSON.stringify(payload) });
  const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
  if (!res.ok || !body?.ok) {
    throw new MockHttpError(502, `บันทึกลง Google Sheets ไม่สำเร็จ${body?.error ? `: ${body.error}` : ''} กรุณาลองใหม่`);
  }
}

async function ensureLoaded() {
  if (loaded) return;
  if (GAS) {
    const data = await gasCall<Record<Table, Record<string, string>[]> & { users: SessionUser[] }>('loadAll');
    for (const t of TABLES) (store[t] as unknown[]) = data[t].map((r) => fromSheet(t, r));
    store.users = data.users.map((u) => ({ ...u, password: '' }));
    loaded = true;
    return;
  }
  const res = await fetch(SHEETS_URL).catch(() => null);
  const body = (await res?.json().catch(() => null)) as { ok?: boolean; data?: Record<Table, Record<string, string>[]> } | null;
  if (!body?.ok || !body.data) throw new MockHttpError(502, 'เชื่อมต่อ Google Sheets ไม่สำเร็จ กรุณาลองใหม่');
  const data = body.data;
  if (data.patients.length === 0) {
    // Empty Sheet: write the synthetic demo patients once so the trial has something to show.
    const s = seed();
    await sheetsPost({ ops: TABLES.flatMap((t) => (s[t] as { id: string }[]).map((row) => ({ type: 'insert', table: t, row }))) });
    store = { ...s, session: store.session };
  } else {
    for (const t of TABLES) (store[t] as unknown[]) = data[t].map((r) => fromSheet(t, r));
  }
  loaded = true;
}

function insert<T extends Table>(table: T, row: Store[T][number]) {
  (store[table] as Store[T][number][]).push(row);
  pending.push({ type: 'insert', table, row });
}

function update<T extends Table>(table: T, row: Store[T][number]) {
  pending.push({ type: 'update', table, row });
}

/** Removes every row of `table` matching `match`; returns how many were removed. */
function remove<T extends Table>(table: T, match: (row: Store[T][number]) => boolean) {
  const rows = store[table] as Store[T][number][];
  const gone = rows.filter(match);
  (store[table] as Store[T][number][]) = rows.filter((r) => !match(r));
  for (const row of gone) pending.push({ type: 'delete', table, row: { id: row.id } });
  return gone.length;
}

function findOr404<T extends Table>(table: T, id: string, what: string): Store[T][number] {
  const row = (store[table] as Store[T][number][]).find((x) => x.id === id);
  if (!row) throw new MockHttpError(404, `ไม่พบ${what}`);
  return row;
}

export async function resetDemo() {
  if (GAS) throw new MockHttpError(403, 'ระบบใช้งานจริงไม่มีการล้างข้อมูล');
  if (USES_SHEETS) {
    await sheetsPost({ reset: true });
    loaded = false;
    store = { ...store, patients: [], visits: [], labs: [], medications: [], drps: [] };
    await ensureLoaded();
  } else {
    store = { ...seed(), session: store.session };
  }
  save();
}

// ---------------------------------------------------------------- helpers
const userName = (id: string | null) => store.users.find((u) => u.id === id)?.displayName ?? null;

function me(): SessionUser {
  const u = store.users.find((x) => x.id === store.session);
  if (!u) throw new MockHttpError(401, 'กรุณาเข้าสู่ระบบ');
  const { password: _pw, ...user } = u;
  return user;
}

function clinical() {
  const u = me();
  if (u.role === 'admin') throw new MockHttpError(403, 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้');
  return u;
}

function patientOr404(id: string) {
  const p = store.patients.find((x) => x.id === id);
  if (!p) throw new MockHttpError(404, 'ไม่พบผู้ป่วย');
  return p;
}

function summary(p: Store['patients'][number]): PatientSummary {
  const visits = store.visits.filter((v) => v.patientId === p.id).sort((a, b) => b.visitDate.localeCompare(a.visitDate) || b.visitNo - a.visitNo);
  const latest = visits[0];
  const derived = derivePatientStatus(
    {
      birthDate: new Date(p.birthDate),
      labs: store.labs.filter((l) => l.patientId === p.id).map((l) => ({ ...l, collectedAt: new Date(l.collectedAt) })),
      latestVisit: latest
        ? { ...latest, visitDate: new Date(latest.visitDate), nextAppointment: latest.nextAppointment ? new Date(latest.nextAppointment) : null }
        : null,
    },
    rules,
    new Date(),
  );
  return {
    id: p.id,
    hn: p.hn,
    nationalIdMasked: maskNationalId(p.nationalId),
    title: p.title,
    firstName: p.firstName,
    lastName: p.lastName,
    sex: p.sex,
    programStatus: p.programStatus,
    ...derived,
  };
}

const summaries = (status = 'active') =>
  store.patients
    .filter((p) => (p.programStatus ?? 'active') === status)
    .sort((a, b) => a.lastName.localeCompare(b.lastName, 'th'))
    .map(summary)
    .sort((a, b) => urgencyRank(a.color) - urgencyRank(b.color));

const profile = (p: Store['patients'][number]) => ({ ...summary(p), birthDate: p.birthDate, enrolledAt: p.enrolledAt, ckdCause: p.ckdCause, notes: p.notes, dischargeCode: p.dischargeCode ?? null, dischargeDate: p.dischargeDate ?? null, dischargeNote: p.dischargeNote ?? null });

function drpView(d: Store['drps'][number]) {
  return { ...d, pharmacistName: userName(d.pharmacistId), decidedByName: userName(d.decidedById) };
}

export function monthly(month: string) {
  const { from, to } = monthRange(month);
  const inMonth = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= from.getTime() && t < to.getTime();
  };
  return summarizeMonth(
    month,
    store.visits.filter((v) => inMonth(v.visitDate)),
    store.drps.filter((d) => inMonth(d.recordedAt)),
    store.patients.filter((p) => inMonth(p.enrolledAt)).length,
    store.patients
      .filter((p) => p.programStatus === 'discharged' && p.dischargeDate && inMonth(p.dischargeDate))
      .map((p) => ({ dischargeCode: p.dischargeCode ?? null })),
  );
}

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

// ---------------------------------------------------------------- router
type Handler = (m: RegExpMatchArray, body: unknown, query: URLSearchParams) => unknown;
const routes: [string, RegExp, Handler][] = [
  ['POST', /^\/auth\/login$/, (_m, body) => {
    const { username, password } = loginSchema.parse(body);
    const u = store.users.find((x) => x.username === username && x.password === password && x.active !== false);
    if (!u) throw new MockHttpError(401, 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    store.session = u.id;
    return { user: me() };
  }],
  ['POST', /^\/auth\/logout$/, () => {
    store.session = null;
    return { ok: true };
  }],
  ['GET', /^\/admin\/users$/, () => {
    if (me().role !== 'supervisor') throw new MockHttpError(403, 'เฉพาะเภสัชคลินิกที่จัดการผู้ใช้ได้');
    return { users: store.users.map((u) => ({ email: u.username, displayName: u.displayName, role: u.role, active: u.active !== false })) };
  }],
  ['POST', /^\/admin\/users$/, (_m, body) => {
    const current = me();
    if (current.role !== 'supervisor') throw new MockHttpError(403, 'เฉพาะเภสัชคลินิกที่จัดการผู้ใช้ได้');
    const b = (body ?? {}) as { email?: string; displayName?: string; role?: string; active?: boolean; password?: string };
    const email = String(b.email ?? '').trim().toLowerCase();
    if (b.password && b.password.length < 6) throw new MockHttpError(400, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัว');
    if (!email) throw new MockHttpError(400, 'กรุณาระบุอีเมลหรือชื่อผู้ใช้');
    if (!['pharmacist', 'supervisor', 'admin'].includes(String(b.role))) throw new MockHttpError(400, 'สิทธิ์ไม่ถูกต้อง');
    if (email === current.username && (b.active === false || b.role !== 'supervisor')) {
      throw new MockHttpError(400, 'ไม่สามารถลดสิทธิ์หรือระงับบัญชีของตัวเองได้');
    }
    const existing = store.users.find((u) => u.username === email);
    const fields = { displayName: String(b.displayName ?? '').trim() || email, role: b.role as SessionUser['role'], active: b.active !== false };
    // Demo: the sign-in name is the account name itself; a new password replaces the demo one.
    if (existing) Object.assign(existing, fields, b.password ? { password: b.password } : {});
    else store.users.push({ id: newId(), username: email, password: b.password || 'demo1234', ...fields });
    return {
      users: store.users.map((u) => ({ email: u.username, displayName: u.displayName, role: u.role, active: u.active !== false, username: u.username, hasPassword: true })),
      note: '',
    };
  }],
  ['POST', /^\/admin\/users\/delete$/, (_m, body) => {
    const current = me();
    if (current.role !== 'supervisor') throw new MockHttpError(403, 'เฉพาะเภสัชคลินิกที่จัดการผู้ใช้ได้');
    const email = String((body as { email?: string })?.email ?? '').trim().toLowerCase();
    if (email === current.username) throw new MockHttpError(400, 'ไม่สามารถลบบัญชีของตัวเองได้');
    const i = store.users.findIndex((u) => u.username === email);
    if (i < 0) throw new MockHttpError(404, 'ไม่พบผู้ใช้');
    store.users.splice(i, 1);
    return {
      users: store.users.map((u) => ({ email: u.username, displayName: u.displayName, role: u.role, active: u.active !== false, username: u.username, hasPassword: true })),
      note: '',
    };
  }],
  ['POST', /^\/auth\/change$/, () => {
    throw new MockHttpError(400, 'เวอร์ชันสาธิตเปลี่ยนรหัสผ่านไม่ได้');
  }],
  ['GET', /^\/auth\/me$/, () => ({ user: me(), demoMode: true, staticDemo: true })],

  ['GET', /^\/patients$/, (_m, _b, q) => {
    clinical();
    let items = summaries(q.get('status') === 'discharged' ? 'discharged' : 'active');
    const text = q.get('q')?.toLowerCase();
    if (text) items = items.filter((p) => `${p.hn} ${p.firstName} ${p.lastName}`.toLowerCase().includes(text));
    if (q.get('stage')) items = items.filter((p) => p.stage === q.get('stage'));
    if (q.get('color')) items = items.filter((p) => (p.color ?? 'none') === q.get('color'));
    const page = Math.max(1, Number(q.get('page') ?? 1));
    const pageSize = 25;
    return { items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, pageSize };
  }],
  ['POST', /^\/patients$/, (_m, body) => {
    clinical();
    const d = patientCreateSchema.parse(body);
    if (store.patients.some((p) => p.nationalId === d.nationalId)) throw new MockHttpError(409, 'เลขบัตรประชาชนนี้ลงทะเบียนแล้ว', 'nationalId');
    if (store.patients.some((p) => p.hn === d.hn)) throw new MockHttpError(409, 'HN นี้ลงทะเบียนแล้ว', 'hn');
    const p = { id: newId(), ...d, birthDate: d.birthDate.toISOString(), enrolledAt: d.enrolledAt.toISOString(), ckdCause: d.ckdCause ?? null, notes: d.notes ?? null, programStatus: 'active' };
    insert('patients', p);
    return { patient: profile(p) };
  }],
  ['PATCH', /^\/patients\/([^/]+)$/, (m, body) => {
    clinical();
    const p = patientOr404(m[1]!);
    const d = patientUpdateSchema.parse(body);
    if (d.hn && store.patients.some((x) => x.id !== p.id && x.hn === d.hn)) throw new MockHttpError(409, 'HN นี้ลงทะเบียนแล้ว', 'hn');
    Object.assign(p, {
      ...d,
      ...(d.birthDate && { birthDate: d.birthDate.toISOString() }),
      ...(d.enrolledAt && { enrolledAt: d.enrolledAt.toISOString() }),
      ...('ckdCause' in d && { ckdCause: d.ckdCause ?? null }),
      ...('notes' in d && { notes: d.notes ?? null }),
    });
    update('patients', p);
    return { patient: profile(p) };
  }],
  ['DELETE', /^\/patients\/([^/]+)$/, (m) => {
    if (clinical().role !== 'supervisor') throw new MockHttpError(403, 'เฉพาะเภสัชคลินิกที่ลบผู้ป่วยได้');
    const id = patientOr404(m[1]!).id;
    for (const t of ['drps', 'medications', 'labs', 'visits'] as const) remove(t, (r) => r.patientId === id);
    remove('patients', (r) => r.id === id);
    return { ok: true };
  }],
  ['POST', /^\/patients\/([^/]+)\/discharge$/, (m, body) => {
    clinical();
    const p = patientOr404(m[1]!);
    const d = dischargeSchema.parse(body);
    Object.assign(p, { programStatus: 'discharged', dischargeCode: d.dischargeCode, dischargeDate: d.dischargeDate.toISOString(), dischargeNote: d.dischargeNote ?? null });
    update('patients', p);
    return { patient: profile(p) };
  }],
  ['POST', /^\/patients\/([^/]+)\/reactivate$/, (m) => {
    clinical();
    const p = patientOr404(m[1]!);
    Object.assign(p, { programStatus: 'active', dischargeCode: null, dischargeDate: null, dischargeNote: null });
    update('patients', p);
    return { patient: profile(p) };
  }],
  ['GET', /^\/patients\/([^/]+)$/, (m) => {
    clinical();
    return { patient: profile(patientOr404(m[1]!)) };
  }],
  ['GET', /^\/patients\/([^/]+)\/labs$/, (m) => {
    clinical();
    patientOr404(m[1]!);
    const labs = store.labs.filter((l) => l.patientId === m[1]).map((l) => ({ ...l, collectedAt: new Date(l.collectedAt) }));
    return { items: labHistory(labs, rules, new Date()) };
  }],
  ['GET', /^\/patients\/([^/]+)\/visits$/, (m) => {
    clinical();
    patientOr404(m[1]!);
    return {
      items: store.visits
        .filter((v) => v.patientId === m[1])
        .sort((a, b) => b.visitNo - a.visitNo)
        .map((v) => ({ ...v, pharmacistName: userName(v.pharmacistId) })),
    };
  }],
  ['POST', /^\/patients\/([^/]+)\/visits$/, (m, body) => {
    const u = clinical();
    patientOr404(m[1]!);
    const { labs, medications, ...d } = visitCreateSchema.parse(body);
    const visitNo = Math.max(0, ...store.visits.filter((v) => v.patientId === m[1]).map((v) => v.visitNo)) + 1;
    const v = {
      id: newId(),
      patientId: m[1]!,
      visitNo,
      visitDate: d.visitDate.toISOString(),
      medicationTaking: d.medicationTaking,
      herbalOrPainkiller: d.herbalOrPainkiller,
      herbalDetail: d.herbalDetail ?? null,
      medicationTakingDetail: d.medicationTakingDetail ?? null,
      leftoverMeds: d.leftoverMeds ?? null,
      dietDetail: d.dietDetail ?? null,
      seasoningDetail: d.seasoningDetail ?? null,
      dietControlled: d.dietControlled,
      seasoning: d.seasoning,
      furtherAdjustments: d.furtherAdjustments ?? null,
      nextAppointment: iso(d.nextAppointment),
      aceiArb: d.aceiArb,
      aceiArbNoReason: d.aceiArbNoReason ?? null,
      aceiArbDrug: d.aceiArbDrug ?? null,
      doctorMedChange: d.doctorMedChange ?? null,
      doctorMedChangeDetail: d.doctorMedChangeDetail ?? null,
      urgencyColor: d.urgencyColor ?? null,
      nextSeePharmacist: d.nextSeePharmacist ?? null,
      pharmacistId: u.id,
    };
    insert('visits', v);
    for (const l of labs) insert('labs', { id: newId(), patientId: m[1]!, visitId: v.id, test: l.test, value: l.value, valueText: l.valueText ?? null, unit: l.unit, collectedAt: l.collectedAt.toISOString(), origin: 'user_entered', source: l.source });
    for (const md of medications) insert('medications', { id: newId(), patientId: m[1]!, visitId: v.id, drugName: md.drugName, strength: md.strength ?? null, directions: md.directions ?? null, drugClass: md.drugClass, status: 'active', createdAt: new Date().toISOString() });
    return { visit: v };
  }],
  ['POST', /^\/patients\/([^/]+)\/labs$/, (m, body) => {
    clinical();
    patientOr404(m[1]!);
    const l = labCreateSchema.parse(body);
    const lab = { id: newId(), patientId: m[1]!, visitId: null, test: l.test, value: l.value, valueText: l.valueText ?? null, unit: l.unit, collectedAt: l.collectedAt.toISOString(), origin: 'user_entered', source: l.source };
    insert('labs', lab);
    return { lab };
  }],
  ['PATCH', /^\/visits\/([^/]+)$/, (m, body) => {
    clinical();
    const v = findOr404('visits', m[1]!, 'การติดตาม');
    const d = visitUpdateSchema.parse(body);
    Object.assign(v, {
      visitDate: d.visitDate.toISOString(),
      medicationTaking: d.medicationTaking,
      herbalOrPainkiller: d.herbalOrPainkiller,
      herbalDetail: d.herbalDetail ?? null,
      medicationTakingDetail: d.medicationTakingDetail ?? null,
      leftoverMeds: d.leftoverMeds ?? null,
      dietDetail: d.dietDetail ?? null,
      seasoningDetail: d.seasoningDetail ?? null,
      dietControlled: d.dietControlled,
      seasoning: d.seasoning,
      furtherAdjustments: d.furtherAdjustments ?? null,
      nextAppointment: iso(d.nextAppointment),
      aceiArb: d.aceiArb,
      aceiArbNoReason: d.aceiArbNoReason ?? null,
      aceiArbDrug: d.aceiArbDrug ?? null,
      doctorMedChange: d.doctorMedChange ?? null,
      doctorMedChangeDetail: d.doctorMedChangeDetail ?? null,
      urgencyColor: d.urgencyColor ?? null,
      nextSeePharmacist: d.nextSeePharmacist ?? null,
    });
    update('visits', v);
    return { visit: v };
  }],
  ['DELETE', /^\/visits\/([^/]+)$/, (m) => {
    clinical();
    const v = findOr404('visits', m[1]!, 'การติดตาม');
    // Labs entered on the visit go with it; medicines and DRPs stay on the patient's record.
    remove('labs', (l) => l.visitId === v.id);
    for (const med of store.medications.filter((x) => x.visitId === v.id)) {
      med.visitId = null;
      update('medications', med);
    }
    for (const drp of store.drps.filter((x) => x.visitId === v.id)) {
      drp.visitId = null;
      update('drps', drp);
    }
    remove('visits', (x) => x.id === v.id);
    for (const later of store.visits.filter((x) => x.patientId === v.patientId && x.visitNo > v.visitNo)) {
      later.visitNo -= 1;
      update('visits', later);
    }
    return { ok: true };
  }],
  ['PATCH', /^\/labs\/([^/]+)$/, (m, body) => {
    clinical();
    const lab = findOr404('labs', m[1]!, 'ผลแล็บ');
    const d = labUpdateSchema.parse(body);
    Object.assign(lab, { test: d.test, value: d.value, valueText: d.valueText ?? null, unit: d.unit, collectedAt: d.collectedAt.toISOString(), source: d.source });
    update('labs', lab);
    return { lab };
  }],
  ['DELETE', /^\/labs\/([^/]+)$/, (m) => {
    clinical();
    findOr404('labs', m[1]!, 'ผลแล็บ');
    remove('labs', (x) => x.id === m[1]);
    return { ok: true };
  }],
  ['GET', /^\/patients\/([^/]+)\/medications$/, (m) => {
    clinical();
    patientOr404(m[1]!);
    return { items: store.medications.filter((x) => x.patientId === m[1]).sort((a, b) => a.status.localeCompare(b.status) || b.createdAt.localeCompare(a.createdAt)) };
  }],
  ['POST', /^\/patients\/([^/]+)\/medications$/, (m, body) => {
    clinical();
    patientOr404(m[1]!);
    const d = medicationCreateSchema.parse(body);
    const med = { id: newId(), patientId: m[1]!, visitId: null, drugName: d.drugName, strength: d.strength ?? null, directions: d.directions ?? null, drugClass: d.drugClass, status: 'active', createdAt: new Date().toISOString() };
    insert('medications', med);
    return { medication: med };
  }],
  ['PATCH', /^\/medications\/([^/]+)$/, (m, body) => {
    clinical();
    const med = findOr404('medications', m[1]!, 'รายการยา');
    const d = medicationUpdateSchema.parse(body);
    if (d.drugName !== undefined) med.drugName = d.drugName;
    if ('strength' in d) med.strength = d.strength ?? null;
    if ('directions' in d) med.directions = d.directions ?? null;
    if (d.drugClass) med.drugClass = d.drugClass;
    if (d.status) med.status = d.status;
    update('medications', med);
    return { medication: med };
  }],
  ['DELETE', /^\/medications\/([^/]+)$/, (m) => {
    clinical();
    findOr404('medications', m[1]!, 'รายการยา');
    remove('medications', (x) => x.id === m[1]);
    return { ok: true };
  }],
  ['GET', /^\/patients\/([^/]+)\/drps$/, (m) => {
    clinical();
    patientOr404(m[1]!);
    return { items: store.drps.filter((d) => d.patientId === m[1]).sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)).map(drpView) };
  }],
  ['POST', /^\/patients\/([^/]+)\/drps$/, (m, body) => {
    const u = clinical();
    patientOr404(m[1]!);
    const d = drpCreateSchema.parse(body);
    const drp = { id: newId(), patientId: m[1]!, visitId: d.visitId ?? null, recordedAt: new Date().toISOString(), category: d.category, description: d.description, drugs: d.drugs ?? null, severity: d.severity, recommendation: d.recommendation, prescriberDecision: 'pending', prescriberReason: null, decidedById: null, pharmacistId: u.id };
    insert('drps', drp);
    return { drp: drpView(drp) };
  }],
  ['PATCH', /^\/drps\/([^/]+)$/, (m, body) => {
    clinical();
    const drp = findOr404('drps', m[1]!, 'DRP');
    const d = drpUpdateSchema.parse(body);
    Object.assign(drp, { category: d.category, description: d.description, drugs: d.drugs ?? null, severity: d.severity, recommendation: d.recommendation });
    update('drps', drp);
    return { drp: drpView(drp) };
  }],
  ['DELETE', /^\/drps\/([^/]+)$/, (m) => {
    clinical();
    findOr404('drps', m[1]!, 'DRP');
    remove('drps', (x) => x.id === m[1]);
    return { ok: true };
  }],
  ['PATCH', /^\/drps\/([^/]+)\/decision$/, (m, body) => {
    const u = clinical();
    const d = drpDecisionSchema.parse(body);
    const drp = store.drps.find((x) => x.id === m[1]);
    if (!drp) throw new MockHttpError(404, 'ไม่พบ DRP');
    Object.assign(drp, { prescriberDecision: d.prescriberDecision, prescriberReason: d.prescriberReason ?? null, decidedById: u.id });
    update('drps', drp);
    return { drp: drpView(drp) };
  }],
  ['GET', /^\/dashboard$/, () => {
    clinical();
    const patients = summaries();
    const byColor = { red: 0, orange: 0, yellow: 0, none: 0 };
    const byStage: Record<string, number> = { '1': 0, '2': 0, '3a': 0, '3b': 0, '4': 0, '5': 0, unknown: 0 };
    for (const p of patients) {
      byColor[p.color ?? 'none'] += 1;
      byStage[p.stage ?? 'unknown']! += 1;
    }
    return {
      counts: { total: patients.length, byColor, byStage, pendingDecisions: store.drps.filter((d) => d.prescriberDecision === 'pending').length },
      red: patients.filter((p) => p.color === 'red').slice(0, 20),
      seePharmacistToday: seePharmacistToday(patients, new Date()),
      missed: patients.filter((p) => p.appointment === 'missed'),
      upcoming: patients.filter((p) => p.appointment === 'upcoming').sort((a, b) => (a.nextAppointment ?? '').localeCompare(b.nextAppointment ?? '')),
      insufficientData: patients.filter((p) => p.gfrFlags.includes('missing') || p.gfrFlags.includes('stale')),
      month: monthly(new Date().toISOString().slice(0, 7)),
      trend: lastMonths(6, new Date()).map(monthly),
      aceiArb: aceiArbCoverage(
        store.visits.map((v) => ({ ...v, visitDate: new Date(v.visitDate) })),
        patients.map((p) => p.id),
      ),
      rules: { version: rules.version, approved: rules.approved },
    };
  }],
  ['GET', /^\/reports\/monthly$/, (_m, _b, q) => {
    clinical();
    const month = q.get('month') ?? '';
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new MockHttpError(400, 'รูปแบบเดือนต้องเป็น ปปปป-ดด');
    return monthly(month);
  }],
  ['GET', /^\/reports\/trend$/, (_m, _b, q) => {
    clinical();
    const month = q.get('month') ?? '';
    const months = Number(q.get('months') ?? 12);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !(months >= 2 && months <= 24)) {
      throw new MockHttpError(400, 'รูปแบบเดือนต้องเป็น ปปปป-ดด');
    }
    return { items: lastMonths(months, new Date(`${month}-15T00:00:00Z`)).map(monthly) };
  }],
];

export async function mockApi(path: string, method: string, body: unknown): Promise<unknown> {
  const [pathname = '', qs = ''] = path.split('?');
  if (GAS && pathname === '/admin/users/delete') {
    const res = await gasCall<{ users: unknown[]; note: string }>('deleteUser', (body as { email?: string })?.email ?? '');
    loaded = false;
    return res;
  }
  if (GAS && (pathname === '/admin/users' || pathname === '/auth/change')) {
    if (pathname === '/auth/change') {
      const b = (body ?? {}) as Record<string, string>;
      return gasCall('changeLogin', b.currentUsername ?? '', b.currentPassword ?? '', b.newUsername ?? '', b.newPassword ?? '');
    }
    if (method === 'GET') return { users: await gasCall('listUsers') };
    const saved = await gasCall<{ users: unknown[]; note: string }>('saveUser', body);
    loaded = false; // reload so new names show on records
    return saved;
  }
  // Apps Script sign-in calls go straight to Code.gs; /auth/setup has no local route.
  if (GAS && pathname.startsWith('/auth/')) {
    // Google account identifies the person; the clinic username/password is checked in Code.gs.
    const creds = (body ?? {}) as { username?: string; password?: string };
    let info: { user: SessionUser; loginConfigured: boolean; signedIn: boolean };
    if (pathname === '/auth/login') info = await gasCall('login', creds.username ?? '', creds.password ?? '');
    else if (pathname === '/auth/setup') info = await gasCall('setLogin', creds.username ?? '', creds.password ?? '');
    else if (pathname === '/auth/logout') {
      await gasCall('logout');
      loaded = false;
      return { ok: true };
    } else info = await gasCall('whoami');
    store.session = info.user.id;
    if (!store.users.some((u) => u.id === info.user.id)) store.users.push({ ...info.user, password: '' });
    return { ...info, demoMode: false, gas: true };
  }
  const route = routes.find(([m, re]) => m === method && re.test(pathname));
  if (!route) throw new MockHttpError(404, 'ไม่พบข้อมูล');
  if (!pathname.startsWith('/auth/')) await ensureLoaded();
  pending = [];
  try {
    const result = route[2](pathname.match(route[1])!, body, new URLSearchParams(qs));
    if (REMOTE && pending.length) {
      try {
        await sheetsPost({ ops: pending });
      } catch (err) {
        loaded = false; // local copy may now differ from the Sheet; reload it on the next request
        throw err;
      }
    }
    save();
    return JSON.parse(JSON.stringify(result));
  } catch (err) {
    if (err instanceof ZodError) {
      const first = err.issues[0];
      throw new MockHttpError(400, first?.message ?? 'ข้อมูลไม่ถูกต้อง', first?.path.join('.'));
    }
    throw err;
  }
}
