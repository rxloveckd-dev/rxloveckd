import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  DISCHARGE_CODES,
  dischargeSchema,
  DRP_CATEGORY,
  drpUpdateSchema,
  LAB_TESTS,
  LABELS,
  labUpdateSchema,
  medicationCreateSchema,
  parseLeftovers,
  potassiumOutOfRange,
  SEVERITY,
  visitUpdateSchema,
  type DischargeCode,
  type UrgencyColor,
} from '@rx/shared';
import { ApiError, useMe, usePatient, usePatientList, usePatientMutation, type PatientProfile as PatientProfileData } from '../api';
import { Choice, Empty, ErrorState, Field, Loading, RowActions, Section, Stage, Urgency, UrgencyPicker } from '../components/ui';
import { AlbuminInput } from '../components/AlbuminInput';
import { DateInput } from '../components/DateInput';
import { enterToNext } from '../components/enterToNext';
import { num, pct, thDate, todayIso } from '../format';
import { Icon } from '../components/Icon';
import { LeftoverEditor, leftoverPayload, leftoverRowsFrom, leftoverText } from '../components/LeftoverEditor';

interface VisitRow {
  id: string;
  visitNo: number;
  visitDate: string;
  medicationTaking: 'correct' | 'incorrect';
  medicationTakingDetail?: string | null;
  leftoverMeds?: string | null;
  dietDetail?: string | null;
  seasoningDetail?: string | null;
  herbalOrPainkiller: boolean;
  herbalDetail: string | null;
  dietControlled: boolean;
  seasoning: 'reduce_needed' | 'adjusted';
  furtherAdjustments: string | null;
  nextAppointment: string | null;
  aceiArb: 'yes' | 'no' | null;
  aceiArbNoReason: string | null;
  aceiArbDrug?: 'enalapril' | 'losartan' | null;
  doctorMedChange?: 'yes' | 'no' | null;
  doctorMedChangeDetail?: string | null;
  urgencyColor?: UrgencyColor | null;
  nextSeePharmacist?: 'yes' | 'no' | null;
  pharmacistName: string;
}
interface LabRow {
  id: string;
  test: keyof typeof LABELS.labTest;
  value: number;
  valueText?: string | null;
  unit: string;
  collectedAt: string;
  source: string;
  previous: number | null;
  previousText?: string | null;
  changePct: number | null;
  flags: string[];
}
interface MedRow {
  id: string;
  drugName: string;
  strength: string | null;
  directions: string | null;
  drugClass: keyof typeof LABELS.drugClass;
  status: 'active' | 'stopped';
}
interface DrpRow {
  id: string;
  recordedAt: string;
  category: keyof typeof LABELS.drpCategory;
  description: string;
  drugs: string | null;
  severity: keyof typeof LABELS.severity;
  recommendation: string;
  prescriberDecision: keyof typeof LABELS.prescriberDecision;
  prescriberReason: string | null;
  pharmacistName: string;
  decidedByName: string | null;
}

type Tab = 'visits' | 'labs' | 'medications' | 'drps';
const TABS: [Tab, string][] = [
  ['visits', 'การติดตาม'],
  ['labs', 'ผลแล็บ'],
  ['medications', 'ยาผู้ป่วย'],
  ['drps', 'ปัญหาจากการใช้ยา (DRP)'],
];

/** Shows an API error from a mutation next to the buttons. */
const errText = (err: unknown) => (err instanceof ApiError ? err.message : 'บันทึกไม่สำเร็จ');

// ------------------------------------------------------------------ visits

function VisitEditForm({ patientId, visit, onDone }: { patientId: string; visit: VisitRow; onDone: () => void }) {
  const save = usePatientMutation<unknown, unknown>(patientId, `/visits/${visit.id}`, 'PATCH');
  const [f, setF] = useState({
    visitDate: visit.visitDate.slice(0, 10),
    aceiArb: (visit.aceiArb ?? '') as '' | 'yes' | 'no',
    aceiArbNoReason: visit.aceiArbNoReason ?? '',
    aceiArbDrug: (visit.aceiArbDrug ?? '') as '' | 'enalapril' | 'losartan',
    medicationTaking: visit.medicationTaking,
    medicationTakingDetail: visit.medicationTakingDetail ?? '',
    leftovers: leftoverRowsFrom(visit.leftoverMeds),
    dietDetail: visit.dietDetail ?? '',
    seasoningDetail: visit.seasoningDetail ?? '',
    herbal: visit.herbalOrPainkiller ? 'yes' : 'no',
    herbalDetail: visit.herbalDetail ?? '',
    diet: visit.dietControlled ? 'yes' : 'no',
    seasoning: visit.seasoning,
    furtherAdjustments: visit.furtherAdjustments ?? '',
    nextAppointment: visit.nextAppointment?.slice(0, 10) ?? '',
    nextSeePharmacist: (visit.nextSeePharmacist ?? '') as '' | 'yes' | 'no',
    urgencyColor: (visit.urgencyColor ?? '') as UrgencyColor | '',
    doctorMedChange: (visit.doctorMedChange ?? '') as '' | 'yes' | 'no',
    doctorMedChangeDetail: visit.doctorMedChangeDetail ?? '',
  });
  const [error, setError] = useState('');
  const set = <K extends keyof typeof f>(k: K) => (v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const body = {
      visitDate: f.visitDate,
      medicationTaking: f.medicationTaking,
      medicationTakingDetail: f.medicationTakingDetail || null,
      leftoverMeds: leftoverPayload(f.leftovers),
      herbalOrPainkiller: f.herbal === 'yes',
      herbalDetail: f.herbal === 'yes' ? f.herbalDetail : null,
      dietControlled: f.diet === 'yes',
      dietDetail: f.dietDetail || null,
      seasoning: f.seasoning,
      seasoningDetail: f.seasoningDetail || null,
      furtherAdjustments: f.furtherAdjustments || null,
      nextAppointment: f.nextAppointment || null,
      nextSeePharmacist: f.nextAppointment ? f.nextSeePharmacist || null : null,
      urgencyColor: f.urgencyColor || null,
      doctorMedChange: f.doctorMedChange || null,
      doctorMedChangeDetail: f.doctorMedChange === 'yes' ? f.doctorMedChangeDetail : null,
      aceiArb: f.aceiArb || undefined,
      aceiArbNoReason: f.aceiArb === 'no' ? f.aceiArbNoReason : null,
      aceiArbDrug: f.aceiArb === 'yes' ? f.aceiArbDrug || null : null,
    };
    const parsed = visitUpdateSchema.safeParse(body);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ครบ');
    setError('');
    try {
      await save.mutateAsync(body);
      onDone();
    } catch (err) {
      setError(errText(err));
    }
  }

  return (
    <form onSubmit={submit} onKeyDown={enterToNext} noValidate>
      <div className="grid-2">
        <Field label="วันที่มา" htmlFor={`vd-${visit.id}`}>
          <DateInput id={`vd-${visit.id}`} value={f.visitDate} onChange={set('visitDate')} />
        </Field>
        <Field label="นัดครั้งต่อไป" htmlFor={`na-${visit.id}`}>
          <DateInput id={`na-${visit.id}`} value={f.nextAppointment} min={f.visitDate} onChange={set('nextAppointment')} />
        </Field>
        <Field label="ครั้งถัดไป">
          <Choice name={`see-${visit.id}`} value={f.nextSeePharmacist} options={[['yes', LABELS.nextSeePharmacist.yes], ['no', LABELS.nextSeePharmacist.no]]} onChange={set('nextSeePharmacist')} />
        </Field>
        <Field label="สีความเร่งด่วน">
          <UrgencyPicker name={`urgency-${visit.id}`} value={f.urgencyColor} onChange={set('urgencyColor')} />
        </Field>
        <Field label="แพทย์มีการปรับเปลี่ยนยา">
          <Choice name={`doc-${visit.id}`} value={f.doctorMedChange} options={[['yes', 'มี'], ['no', 'ไม่มี']]} onChange={set('doctorMedChange')} />
          {f.doctorMedChange === 'yes' && (
            <input aria-label="ระบุการปรับเปลี่ยนยา" placeholder="ระบุการปรับเปลี่ยนยา" value={f.doctorMedChangeDetail} onChange={(e) => set('doctorMedChangeDetail')(e.target.value)} className="detail-input" />
          )}
        </Field>
        <Field label="ยากลุ่ม ACEI/ARB">
          <Choice name={`acei-${visit.id}`} value={f.aceiArb} options={[['yes', 'มี'], ['no', 'ไม่มี']]} onChange={set('aceiArb')} />
          {f.aceiArb === 'yes' && (
            <div style={{ marginTop: 6 }}>
              <Choice name={`aceid-${visit.id}`} value={f.aceiArbDrug} options={[['enalapril', 'Enalapril'], ['losartan', 'Losartan']]} onChange={set('aceiArbDrug')} />
            </div>
          )}
          {f.aceiArb === 'no' && (
            <input aria-label="ไม่มีเพราะ" placeholder="ไม่มีเพราะ" value={f.aceiArbNoReason} onChange={(e) => set('aceiArbNoReason')(e.target.value)} style={{ font: 'inherit', padding: 8, marginTop: 6 }} />
          )}
        </Field>
        <Field label="การกินยา">
          <Choice name={`taking-${visit.id}`} danger={['incorrect']} value={f.medicationTaking} options={[['correct', 'ถูกต้อง'], ['incorrect', 'ไม่ถูกต้อง']]} onChange={set('medicationTaking')} />
          {f.medicationTaking === 'incorrect' && (
            <input aria-label="ระบุการกินยาที่ไม่ถูกต้อง" placeholder="ระบุ" value={f.medicationTakingDetail} onChange={(e) => set('medicationTakingDetail')(e.target.value)} className="detail-input warn" />
          )}
        </Field>
        <Field label="กินยาสมุนไพร/ยาแก้ปวด">
          <Choice name={`herbal-${visit.id}`} danger={['yes']} value={f.herbal} options={[['yes', 'กิน'], ['no', 'ไม่กิน']]} onChange={set('herbal')} />
          {f.herbal === 'yes' && (
            <input aria-label="รายละเอียดยาสมุนไพร/ยาแก้ปวด" placeholder="ชื่อยา ซื้อจากที่ไหน" value={f.herbalDetail} onChange={(e) => set('herbalDetail')(e.target.value)} className="detail-input warn" />
          )}
        </Field>
        <Field label="อาหาร">
          <Choice name={`diet-${visit.id}`} danger={['no']} value={f.diet} options={[['yes', 'คุมอาหาร'], ['no', 'ไม่คุม']]} onChange={set('diet')} />
          {f.diet === 'no' && (
            <input aria-label="ระบุเรื่องอาหาร" placeholder="ระบุ" value={f.dietDetail} onChange={(e) => set('dietDetail')(e.target.value)} className="detail-input warn" />
          )}
        </Field>
        <Field label="เครื่องปรุง">
          <Choice name={`seas-${visit.id}`} danger={['reduce_needed']} value={f.seasoning} options={[['reduce_needed', 'ควรปรับลด'], ['adjusted', 'ปรับลดแล้ว']]} onChange={set('seasoning')} />
          {f.seasoning === 'reduce_needed' && (
            <input aria-label="ระบุเครื่องปรุงที่ควรลด" placeholder="ระบุ" value={f.seasoningDetail} onChange={(e) => set('seasoningDetail')(e.target.value)} className="detail-input warn" />
          )}
        </Field>
        <Field label="Note เภสัชกร" htmlFor={`fu-${visit.id}`}>
          <textarea id={`fu-${visit.id}`} value={f.furtherAdjustments} onChange={(e) => set('furtherAdjustments')(e.target.value)} />
        </Field>
      </div>
      <LeftoverEditor idPrefix={`lo-${visit.id}`} rows={f.leftovers} onChange={set('leftovers')} />
      <FormButtons busy={save.isPending} error={error} onCancel={onDone} />
    </form>
  );
}

function FormButtons({ busy, error, onCancel, label = 'บันทึกการแก้ไข' }: { busy: boolean; error: string; onCancel?: () => void; label?: string }) {
  return (
    <div className="row" style={{ marginTop: 12 }}>
      <button className="btn small" disabled={busy}><Icon name="save" />{busy ? 'กำลังบันทึก…' : label}</button>
      {onCancel && <button type="button" className="btn secondary small" onClick={onCancel}><Icon name="x" />ยกเลิก</button>}
      {error && <span className="down">{error}</span>}
    </div>
  );
}

/** รายการยาที่เหลือ as short lines; text saved before the list existed is shown as is. */
function LeftoverList({ stored }: { stored: string | null | undefined }) {
  const { items, legacy } = parseLeftovers(stored);
  if (legacy) return <>{legacy}</>;
  if (!items.length) return <>–</>;
  return (
    <ul style={{ margin: 0, paddingLeft: 18 }}>
      {items.map((i, n) => <li key={n}>{leftoverText(i)}</li>)}
    </ul>
  );
}

function Visits({ id }: { id: string }) {
  const { data, isLoading, error } = usePatientList<VisitRow>(id, 'visits');
  const [editing, setEditing] = useState<string | null>(null);
  const [delError, setDelError] = useState('');
  const remove = usePatientMutation<{ visitId: string }, unknown>(id, (b) => `/visits/${b.visitId}`, 'DELETE');
  if (isLoading) return <Loading />;
  if (error || !data) return <ErrorState error={error} />;
  if (!data.items.length) return <Empty>ยังไม่มีการติดตาม <Link to={`/patients/${id}/visits/new`}>บันทึกครั้งแรก</Link></Empty>;
  return (
    <>
      {delError && <div className="alert" role="alert" style={{ marginBottom: 12 }}>{delError}</div>}
      <div className="grid-2">
        {data.items.map((v) => (
          <Section
            key={v.id}
            title={`ติดตามครั้งที่ ${v.visitNo}`}
            action={
              <span className="row" style={{ gap: 8 }}>
                <span className="muted">{thDate(v.visitDate)}</span>
                {editing !== v.id && (
                  <RowActions
                    busy={remove.isPending}
                    onEdit={() => setEditing(v.id)}
                    confirmText={`ลบการติดตามครั้งที่ ${v.visitNo} (${thDate(v.visitDate)})?\nผลแล็บที่บันทึกในครั้งนี้จะถูกลบด้วย ส่วนรายการยายังอยู่`}
                    onDelete={() => {
                      setDelError('');
                      remove.mutate({ visitId: v.id }, { onError: (err) => setDelError(errText(err)) });
                    }}
                  />
                )}
              </span>
            }
          >
            {editing === v.id ? (
              <VisitEditForm patientId={id} visit={v} onDone={() => setEditing(null)} />
            ) : (
              <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 14px' }}>
                <dt className="muted">ยากลุ่ม ACEI/ARB</dt>
                <dd style={{ margin: 0 }}>
                  {v.aceiArb ? LABELS.aceiArb[v.aceiArb] : '–'}
                  {v.aceiArb === 'yes' && v.aceiArbDrug ? ` (${LABELS.aceiArbDrug[v.aceiArbDrug]})` : ''}
                  {v.aceiArb === 'no' && v.aceiArbNoReason ? ` เพราะ${v.aceiArbNoReason}` : ''}
                </dd>
                <dt className="muted">แพทย์ปรับเปลี่ยนยา</dt>
                <dd style={{ margin: 0 }}>
                  {v.doctorMedChange ? LABELS.doctorMedChange[v.doctorMedChange] : '–'}
                  {v.doctorMedChange === 'yes' && v.doctorMedChangeDetail ? `: ${v.doctorMedChangeDetail}` : ''}
                </dd>
                <dt className="muted">การกินยา</dt>
                <dd style={{ margin: 0 }} className={v.medicationTaking === 'incorrect' ? 'down' : ''}>
                  {LABELS.medicationTaking[v.medicationTaking]}
                  {v.medicationTaking === 'incorrect' && v.medicationTakingDetail ? `: ${v.medicationTakingDetail}` : ''}
                </dd>
                <dt className="muted">รายการยาที่เหลือ</dt>
                <dd style={{ margin: 0 }}><LeftoverList stored={v.leftoverMeds} /></dd>
                <dt className="muted">ยาสมุนไพร/ยาแก้ปวด</dt>
                <dd style={{ margin: 0 }} className={v.herbalOrPainkiller ? 'down' : ''}>
                  {v.herbalOrPainkiller ? `กิน${v.herbalDetail ? `: ${v.herbalDetail}` : ''}` : 'ไม่กิน'}
                </dd>
                <dt className="muted">อาหาร</dt>
                <dd style={{ margin: 0 }} className={v.dietControlled ? '' : 'down'}>{v.dietControlled ? 'คุม' : `ไม่คุม${v.dietDetail ? `: ${v.dietDetail}` : ''}`}</dd>
                <dt className="muted">เครื่องปรุง</dt>
                <dd style={{ margin: 0 }} className={v.seasoning === 'reduce_needed' ? 'down' : ''}>
                  {LABELS.seasoning[v.seasoning]}
                  {v.seasoning === 'reduce_needed' && v.seasoningDetail ? `: ${v.seasoningDetail}` : ''}
                </dd>
                <dt className="muted">Note เภสัชกร</dt>
                <dd style={{ margin: 0 }}>{v.furtherAdjustments || '–'}</dd>
                <dt className="muted">นัดครั้งต่อไป</dt>
                <dd style={{ margin: 0 }}>
                  {thDate(v.nextAppointment)}
                  {v.nextSeePharmacist ? ` (${LABELS.nextSeePharmacist[v.nextSeePharmacist]})` : ''}
                </dd>
                <dt className="muted">สีความเร่งด่วน</dt>
                <dd style={{ margin: 0 }}><Urgency color={v.urgencyColor ?? null} /></dd>
                <dt className="muted">เภสัชกร</dt>
                <dd style={{ margin: 0 }}>{v.pharmacistName}</dd>
              </dl>
            )}
          </Section>
        ))}
      </div>
    </>
  );
}

// ------------------------------------------------------------------ labs

type LabTest = keyof typeof LABELS.labTest;

/** Albumin shows its level; other tests, and albumin saved as a number before, show the number. */
const labValue = (l: LabRow) => l.valueText ?? num(l.value, 2);

/** Add (no `lab`) or edit one lab result. */
function LabForm({ patientId, lab, onDone }: { patientId: string; lab?: LabRow; onDone?: () => void }) {
  const save = usePatientMutation<unknown, unknown>(patientId, lab ? `/labs/${lab.id}` : `/patients/${patientId}/labs`, lab ? 'PATCH' : 'POST');
  const blank = { test: 'gfr' as LabTest, value: '', valueText: '', collectedAt: todayIso(), source: 'บันทึกเอง' };
  const [f, setF] = useState(lab ? { test: lab.test, value: String(lab.value), valueText: lab.valueText ?? '', collectedAt: lab.collectedAt.slice(0, 10), source: lab.source } : blank);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    const body = { ...f, valueText: f.valueText.trim() || null, unit: LABELS.labUnit[f.test] };
    const parsed = labUpdateSchema.safeParse(body);
    if (!parsed.success || f.value.trim() === '') return setError(f.value.trim() === '' ? 'กรุณากรอกค่า' : parsed.error!.issues[0]?.message ?? 'ข้อมูลไม่ครบ');
    setError('');
    try {
      await save.mutateAsync(body);
      if (lab) onDone?.();
      else setF(blank);
    } catch (err) {
      setError(errText(err));
    }
  }

  const key = lab?.id ?? 'new';
  const oldAlbumin = lab?.test === 'albumin' && !lab.valueText ? String(lab.value) : '';
  const range = f.test === 'hba1c' || f.test === 'potassium' ? ` (${LABELS.labRange[f.test]})` : '';
  const potassiumOff = f.test === 'potassium' && f.value.trim() !== '' && potassiumOutOfRange(Number(f.value));
  return (
    <form onSubmit={submit} onKeyDown={enterToNext} noValidate>
      <div className="grid-3">
        <Field label="รายการ" htmlFor={`lt-${key}`}>
          <select
            id={`lt-${key}`}
            value={f.test}
            onChange={(e) => {
              const test = e.target.value as LabTest;
              const kindChanged = (test === 'albumin') !== (f.test === 'albumin');
              setF({ ...f, test, ...(kindChanged && { value: '', valueText: '' }) });
            }}
          >
            {LAB_TESTS.map((t) => <option key={t} value={t}>{LABELS.labTest[t]}</option>)}
          </select>
        </Field>
        <Field label={`ค่า (${LABELS.labUnit[f.test]})${range}`} htmlFor={`lv-${key}`} error={potassiumOff ? 'นอกช่วงปกติ' : undefined}>
          {f.test === 'albumin' ? (
            <AlbuminInput
              id={`lv-${key}`}
              value={f.valueText}
              emptyLabel={oldAlbumin ? `ค่าเดิม ${oldAlbumin}` : 'เลือก'}
              onChange={(valueText) => setF({ ...f, valueText, value: valueText.trim() ? '0' : oldAlbumin })}
            />
          ) : (
            <input id={`lv-${key}`} inputMode="decimal" className={potassiumOff ? 'out-of-range' : undefined} value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} />
          )}
        </Field>
        <Field label="วันที่ตรวจ" htmlFor={`ld-${key}`}>
          <DateInput id={`ld-${key}`} value={f.collectedAt} onChange={(collectedAt) => setF({ ...f, collectedAt })} />
        </Field>
      </div>
      <FormButtons busy={save.isPending} error={error} onCancel={onDone} label={lab ? 'บันทึกการแก้ไข' : 'เพิ่มผลแล็บ'} />
    </form>
  );
}

function Labs({ id }: { id: string }) {
  const { data, isLoading, error } = usePatientList<LabRow>(id, 'labs');
  const [editing, setEditing] = useState<string | null>(null);
  const [delError, setDelError] = useState('');
  const remove = usePatientMutation<{ labId: string }, unknown>(id, (b) => `/labs/${b.labId}`, 'DELETE');
  const editingLab = data?.items.find((l) => l.id === editing);
  return (
    <>
      <Section title={editingLab ? `แก้ไขผลแล็บ ${LABELS.labTest[editingLab.test]} วันที่ ${thDate(editingLab.collectedAt)}` : 'เพิ่มผลแล็บ'}>
        {editingLab ? (
          <LabForm key={editingLab.id} patientId={id} lab={editingLab} onDone={() => setEditing(null)} />
        ) : (
          <LabForm patientId={id} />
        )}
      </Section>
      <Section title="ผลแล็บ">
        {delError && <div className="alert" role="alert">{delError}</div>}
        {isLoading ? <Loading /> : error || !data ? <ErrorState error={error} /> : !data.items.length ? (
          <Empty>ยังไม่มีผลแล็บ</Empty>
        ) : (
          <div className="table-wrap">
            <table className="stack">
              <thead>
                <tr><th>รายการ</th><th>วันที่ตรวจ</th><th className="num">ค่า</th><th>หน่วย</th><th className="num">ครั้งก่อน</th><th className="num">เปลี่ยนแปลง</th><th>ที่มา</th><th /></tr>
              </thead>
              <tbody>
                {data.items.map((l) => (
                  <tr key={l.id}>
                    <td className="lead">{LABELS.labTest[l.test] ?? l.test}</td>
                    <td data-label="วันที่ตรวจ">{thDate(l.collectedAt)}</td>
                    <td data-label="ค่า" className={`num ${l.test === 'potassium' && potassiumOutOfRange(l.value) ? 'down' : ''}`}>
                      {labValue(l)}
                      {l.flags.includes('implausible') && <div className="down" style={{ fontSize: '0.8rem' }}>ค่าผิดปกติ ตรวจสอบ</div>}
                    </td>
                    <td data-label="หน่วย">{l.unit}</td>
                    <td data-label="ครั้งก่อน" className="num">{l.previousText ?? num(l.previous, 2)}</td>
                    <td data-label="เปลี่ยนแปลง" className={`num ${l.changePct !== null && l.changePct <= -10 ? 'down' : ''}`}>{l.test === 'gfr' ? pct(l.changePct) : ''}</td>
                    <td data-label="ที่มา" className="muted">{l.source}</td>
                    <td data-label="">
                      <RowActions
                        busy={remove.isPending}
                        onEdit={() => setEditing(l.id)}
                        confirmText={`ลบผล ${LABELS.labTest[l.test] ?? l.test} = ${l.valueText ?? l.value} ${l.unit} (${thDate(l.collectedAt)})?`}
                        onDelete={() => {
                          setDelError('');
                          if (editing === l.id) setEditing(null);
                          remove.mutate({ labId: l.id }, { onError: (err) => setDelError(errText(err)) });
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted" style={{ fontSize: '0.85rem' }}>% เปลี่ยนแปลงคำนวณจากผล GFR ครั้งก่อนที่ใช้หน่วยเดียวกัน</p>
          </div>
        )}
      </Section>
    </>
  );
}

// ------------------------------------------------------------------ medications

type DrugClass = keyof typeof LABELS.drugClass;

/** Add (no `med`) or edit one medicine. */
function MedForm({ patientId, med, onDone }: { patientId: string; med?: MedRow; onDone?: () => void }) {
  const save = usePatientMutation<unknown, unknown>(patientId, med ? `/medications/${med.id}` : `/patients/${patientId}/medications`, med ? 'PATCH' : 'POST');
  const blank = { drugName: '', strength: '', directions: '', drugClass: 'other' as DrugClass };
  const [f, setF] = useState(med ? { drugName: med.drugName, strength: med.strength ?? '', directions: med.directions ?? '', drugClass: med.drugClass } : blank);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    const body = { ...f, strength: f.strength || null, directions: f.directions || null };
    const parsed = medicationCreateSchema.safeParse(body);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ครบ');
    setError('');
    try {
      await save.mutateAsync(body);
      if (med) onDone?.();
      else setF(blank);
    } catch (err) {
      setError(errText(err));
    }
  }

  const key = med?.id ?? 'new';
  return (
    <form onSubmit={submit} onKeyDown={enterToNext} noValidate>
      <div className="grid-2">
        <Field label="ชื่อยา" htmlFor={`mn-${key}`}><input id={`mn-${key}`} value={f.drugName} onChange={(e) => setF({ ...f, drugName: e.target.value })} /></Field>
        <Field label="ความแรง" htmlFor={`ms-${key}`}><input id={`ms-${key}`} value={f.strength} onChange={(e) => setF({ ...f, strength: e.target.value })} /></Field>
        <Field label="วิธีใช้" htmlFor={`md-${key}`}><input id={`md-${key}`} value={f.directions} onChange={(e) => setF({ ...f, directions: e.target.value })} /></Field>
        <Field label="กลุ่มยา" htmlFor={`mc-${key}`}>
          <select id={`mc-${key}`} value={f.drugClass} onChange={(e) => setF({ ...f, drugClass: e.target.value as DrugClass })}>
            {Object.entries(LABELS.drugClass).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
      </div>
      <FormButtons busy={save.isPending} error={error} onCancel={onDone} label={med ? 'บันทึกการแก้ไข' : 'เพิ่มยา'} />
    </form>
  );
}

function Medications({ id }: { id: string }) {
  const { data, isLoading, error } = usePatientList<MedRow>(id, 'medications');
  const [editing, setEditing] = useState<string | null>(null);
  const [rowError, setRowError] = useState('');
  const update = usePatientMutation<{ medId: string; status: string }, unknown>(id, (b) => `/medications/${b.medId}`, 'PATCH');
  const remove = usePatientMutation<{ medId: string }, unknown>(id, (b) => `/medications/${b.medId}`, 'DELETE');
  const editingMed = data?.items.find((m) => m.id === editing);
  const onError = (err: unknown) => setRowError(errText(err));
  return (
    <>
      <Section title={editingMed ? `แก้ไขยา ${editingMed.drugName}` : 'เพิ่มยา'}>
        {editingMed ? (
          <MedForm key={editingMed.id} patientId={id} med={editingMed} onDone={() => setEditing(null)} />
        ) : (
          <MedForm patientId={id} />
        )}
      </Section>
      <Section title="ยาผู้ป่วย">
        {rowError && <div className="alert" role="alert">{rowError}</div>}
        {isLoading ? <Loading /> : error || !data ? <ErrorState error={error} /> : !data.items.length ? (
          <Empty>ยังไม่มีรายการยา</Empty>
        ) : (
          <div className="table-wrap">
            <table className="stack">
              <thead><tr><th>ชื่อยา</th><th>ความแรง</th><th>วิธีใช้</th><th>กลุ่มยา</th><th>สถานะ</th><th /></tr></thead>
              <tbody>
                {data.items.map((m) => (
                  <tr key={m.id} style={m.status === 'stopped' ? { color: 'var(--ink-soft)' } : undefined}>
                    <td className="lead">{m.drugName}</td>
                    <td data-label="ความแรง">{m.strength ?? '–'}</td>
                    <td data-label="วิธีใช้">{m.directions ?? '–'}</td>
                    <td data-label="กลุ่มยา">{LABELS.drugClass[m.drugClass]}</td>
                    <td data-label="สถานะ">{m.status === 'active' ? 'ใช้อยู่' : 'หยุดแล้ว'}</td>
                    <td data-label="">
                      <span className="row-actions">
                        <button
                          className="btn secondary small"
                          disabled={update.isPending}
                          onClick={() => {
                            setRowError('');
                            update.mutate({ medId: m.id, status: m.status === 'active' ? 'stopped' : 'active' }, { onError });
                          }}
                        >
                          <Icon name="pill" />
                          {m.status === 'active' ? 'บันทึกว่าหยุดยา' : 'กลับมาใช้'}
                        </button>
                        <RowActions
                          busy={remove.isPending}
                          onEdit={() => setEditing(m.id)}
                          confirmText={`ลบยา ${m.drugName}${m.strength ? ` ${m.strength}` : ''} ออกจากรายการ?\nถ้าผู้ป่วยแค่หยุดยา ให้กด "บันทึกว่าหยุดยา" แทน`}
                          onDelete={() => {
                            setRowError('');
                            if (editing === m.id) setEditing(null);
                            remove.mutate({ medId: m.id }, { onError });
                          }}
                        />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}

// ------------------------------------------------------------------ DRPs

function DrpDecision({ patientId, drp }: { patientId: string; drp: DrpRow }) {
  const [decision, setDecision] = useState<string>('accepted');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const save = usePatientMutation<unknown, unknown>(patientId, `/drps/${drp.id}/decision`, 'PATCH');
  return (
    <form
      className="row"
      onKeyDown={enterToNext}
      onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        try {
          await save.mutateAsync({ prescriberDecision: decision, prescriberReason: reason || null });
        } catch (err) {
          setError(errText(err));
        }
      }}
    >
      <select aria-label="การตัดสินใจของแพทย์" value={decision} onChange={(e) => setDecision(e.target.value)} className="field" style={{ padding: 6 }}>
        <option value="accepted">ยอมรับ</option>
        <option value="modified">ยอมรับแบบปรับ</option>
        <option value="declined">ไม่ยอมรับ</option>
      </select>
      <input aria-label="เหตุผลของแพทย์" placeholder="เหตุผลของแพทย์" value={reason} onChange={(e) => setReason(e.target.value)} style={{ font: 'inherit', padding: 6, flex: 1 }} />
      <button className="btn small" disabled={save.isPending}><Icon name="stethoscope" />บันทึกผลจากแพทย์</button>
      {error && <span className="down">{error}</span>}
    </form>
  );
}

/** Add (no `drp`) or edit the pharmacist's part of a DRP. */
function DrpForm({ patientId, drp, onDone }: { patientId: string; drp?: DrpRow; onDone?: () => void }) {
  const save = usePatientMutation<unknown, unknown>(patientId, drp ? `/drps/${drp.id}` : `/patients/${patientId}/drps`, drp ? 'PATCH' : 'POST');
  const blank = { category: 'adherence', severity: 'medium', description: '', drugs: '', recommendation: '' };
  const [form, setForm] = useState(
    drp ? { category: drp.category as string, severity: drp.severity as string, description: drp.description, drugs: drp.drugs ?? '', recommendation: drp.recommendation } : blank,
  );
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = drpUpdateSchema.safeParse(form);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ครบ');
    setError('');
    try {
      await save.mutateAsync(form);
      if (drp) onDone?.();
      else setForm(blank);
    } catch (err) {
      setError(errText(err));
    }
  }

  const key = drp?.id ?? 'new';
  return (
    <form onSubmit={submit} onKeyDown={enterToNext} className="grid-2" noValidate>
      <Field label="ประเภท" htmlFor={`cat-${key}`}>
        <select id={`cat-${key}`} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {DRP_CATEGORY.map((c) => <option key={c} value={c}>{LABELS.drpCategory[c]}</option>)}
        </select>
      </Field>
      <Field label="ความรุนแรง" htmlFor={`sev-${key}`}>
        <select id={`sev-${key}`} value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
          {SEVERITY.map((s) => <option key={s} value={s}>{LABELS.severity[s]}</option>)}
        </select>
      </Field>
      <Field label="รายละเอียดปัญหา" htmlFor={`desc-${key}`}>
        <textarea id={`desc-${key}`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </Field>
      <Field label="คำแนะนำของเภสัชกร" htmlFor={`rec-${key}`}>
        <textarea id={`rec-${key}`} value={form.recommendation} onChange={(e) => setForm({ ...form, recommendation: e.target.value })} />
      </Field>
      <Field label="ยาที่เกี่ยวข้อง" htmlFor={`drugs-${key}`}>
        <input id={`drugs-${key}`} value={form.drugs} onChange={(e) => setForm({ ...form, drugs: e.target.value })} />
      </Field>
      <div style={{ alignSelf: 'end' }}>
        <FormButtons busy={save.isPending} error={error} onCancel={onDone} label={drp ? 'บันทึกการแก้ไข' : 'บันทึก DRP'} />
      </div>
    </form>
  );
}

function Drps({ id }: { id: string }) {
  const { data, isLoading, error } = usePatientList<DrpRow>(id, 'drps');
  const [editing, setEditing] = useState<string | null>(null);
  const [delError, setDelError] = useState('');
  const remove = usePatientMutation<{ drpId: string }, unknown>(id, (b) => `/drps/${b.drpId}`, 'DELETE');

  return (
    <>
      <Section title="บันทึก DRP ใหม่">
        <DrpForm patientId={id} />
      </Section>
      {delError && <div className="alert" role="alert" style={{ marginTop: 12 }}>{delError}</div>}
      {isLoading ? <Loading /> : error || !data ? <ErrorState error={error} /> : data.items.length === 0 ? (
        <Empty>ยังไม่มี DRP</Empty>
      ) : (
        data.items.map((d) => (
          <Section
            key={d.id}
            title={LABELS.drpCategory[d.category]}
            action={
              <span className="row" style={{ gap: 8 }}>
                <span className="muted">{thDate(d.recordedAt)}</span>
                {editing !== d.id && (
                  <RowActions
                    busy={remove.isPending}
                    onEdit={() => setEditing(d.id)}
                    confirmText={`ลบ DRP "${LABELS.drpCategory[d.category]}" วันที่ ${thDate(d.recordedAt)}?`}
                    onDelete={() => {
                      setDelError('');
                      remove.mutate({ drpId: d.id }, { onError: (err) => setDelError(errText(err)) });
                    }}
                  />
                )}
              </span>
            }
          >
            {editing === d.id ? (
              <DrpForm patientId={id} drp={d} onDone={() => setEditing(null)} />
            ) : (
              <>
                <p style={{ marginTop: 0 }}>{d.description}{d.drugs ? ` (${d.drugs})` : ''}</p>
                <div className="grid-2">
                  <div>
                    <b>คำแนะนำของเภสัชกร</b>
                    <p style={{ margin: '4px 0' }}>{d.recommendation}</p>
                    <span className="muted">{d.pharmacistName}, ความรุนแรง{LABELS.severity[d.severity]}</span>
                  </div>
                  <div>
                    <b>การตัดสินใจของแพทย์</b>
                    <p style={{ margin: '4px 0' }}>
                      {LABELS.prescriberDecision[d.prescriberDecision]}
                      {d.prescriberReason ? `: ${d.prescriberReason}` : ''}
                    </p>
                    {d.decidedByName && <span className="muted">บันทึกโดย {d.decidedByName}</span>}
                  </div>
                </div>
                {d.prescriberDecision === 'pending' && <DrpDecision patientId={id} drp={d} />}
              </>
            )}
          </Section>
        ))
      )}
    </>
  );
}

/** Discharge (จำหน่าย) the patient with a reason, or show the discharge and allow undoing it. */
function DischargePanel({ p }: { p: PatientProfileData }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<DischargeCode | ''>('');
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const discharge = usePatientMutation<unknown, unknown>(p.id, `/patients/${p.id}/discharge`);
  const reactivate = usePatientMutation<unknown, unknown>(p.id, `/patients/${p.id}/reactivate`);

  if (p.programStatus === 'discharged') {
    return (
      <div className="discharged">
        <div>
          <b>จำหน่ายแล้ว</b> เมื่อ {thDate(p.dischargeDate)}: {p.dischargeCode ? `${p.dischargeCode} ${LABELS.discharge[p.dischargeCode]}` : '–'}
          {p.dischargeNote ? ` (${p.dischargeNote})` : ''}
        </div>
        <button
          className="btn secondary small"
          disabled={reactivate.isPending}
          onClick={() => {
            if (window.confirm('ยกเลิกการจำหน่าย และกลับมาติดตามผู้ป่วยรายนี้ต่อ?')) reactivate.mutate({});
          }}
        >
          <Icon name="undo" />ยกเลิกการจำหน่าย
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <div style={{ marginTop: 12 }}>
        <button className="btn secondary small" onClick={() => setOpen(true)}><Icon name="door" />จำหน่ายผู้ป่วย</button>
      </div>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const parsed = dischargeSchema.safeParse({ dischargeCode: code || undefined, dischargeDate: date, dischargeNote: note || null });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ครบ');
      return;
    }
    try {
      await discharge.mutateAsync({ dischargeCode: code, dischargeDate: date, dischargeNote: note || null });
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'บันทึกไม่สำเร็จ');
    }
  }

  return (
    <Section title="จำหน่ายผู้ป่วย">
      <form onSubmit={submit} onKeyDown={enterToNext} className="grid-3">
        <Field label="สถานะจำหน่าย" htmlFor="dc">
          <select id="dc" value={code} onChange={(e) => setCode(e.target.value as DischargeCode)}>
            <option value="">เลือกสถานะ</option>
            {DISCHARGE_CODES.map((c) => (
              <option key={c} value={c}>{c} {LABELS.discharge[c]}</option>
            ))}
          </select>
        </Field>
        <Field label="วันที่จำหน่าย" htmlFor="dd">
          <DateInput id="dd" value={date} onChange={setDate} />
        </Field>
        <Field label={code === '12' ? 'ระบุสาเหตุ' : 'หมายเหตุ (ถ้ามี)'} htmlFor="dn">
          <input id="dn" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="row" style={{ gridColumn: '1 / -1' }}>
          <button className="btn" disabled={discharge.isPending}><Icon name="save" />{discharge.isPending ? 'กำลังบันทึก…' : 'บันทึกการจำหน่าย'}</button>
          <button type="button" className="btn secondary" onClick={() => setOpen(false)}><Icon name="x" />ยกเลิก</button>
          {error && <span className="down">{error}</span>}
        </div>
      </form>
    </Section>
  );
}

export function PatientProfile() {
  const { id = '' } = useParams();
  const { data, isLoading, error } = usePatient(id);
  const me = useMe();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('visits');
  const [delError, setDelError] = useState('');
  const removePatient = usePatientMutation<unknown, unknown>(null, `/patients/${id}`, 'DELETE');
  if (isLoading) return <Loading />;
  if (error || !data) return <ErrorState error={error} />;
  const p = data.patient;

  return (
    <>
      <div className="patient-head">
        <div>
          <div className="row">
            <h1>{p.title}{p.firstName} {p.lastName}</h1>
            {p.color && <Urgency color={p.color} />}
          </div>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            HN {p.hn}, เลขบัตร {p.nationalIdMasked}, อายุ {p.age} ปี, {LABELS.sex[p.sex]}, เข้าคลินิก {thDate(p.enrolledAt)}
          </p>
          {delError && <div className="alert" role="alert" style={{ marginTop: 8 }}>{delError}</div>}
          {p.reasons.length > 0 && (
            <ul className="reasons">
              {p.reasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
          )}
          <div className="row" style={{ marginTop: 12 }}>
            <Link className="btn" to={`/patients/${p.id}/visits/new`}><Icon name="clipboard" />บันทึกการติดตามครั้งใหม่</Link>
            <RowActions
              busy={removePatient.isPending}
              onEdit={() => navigate(`/patients/${p.id}/edit`)}
              confirmText={`ลบผู้ป่วย ${p.title}${p.firstName} ${p.lastName} (HN ${p.hn}) ออกจากระบบ?
การติดตาม ผลแล็บ ยา และ DRP ทั้งหมดของผู้ป่วยรายนี้จะถูกลบด้วย และกู้คืนไม่ได้
ถ้าผู้ป่วยออกจากโครงการ ให้ใช้ "จำหน่ายผู้ป่วย" แทน`}
              onDelete={
                me.data?.user.role === 'supervisor'
                  ? () => {
                      setDelError('');
                      removePatient.mutate(
                        {},
                        { onSuccess: () => navigate('/patients'), onError: (err) => setDelError(errText(err)) },
                      );
                    }
                  : undefined
              }
            />
            <span className="muted">นัดครั้งต่อไป {thDate(p.nextAppointment)}{p.appointment === 'missed' ? ' (เลยนัด)' : ''}{p.nextSeePharmacist ? ` (${LABELS.nextSeePharmacist[p.nextSeePharmacist]})` : ''}</span>
          </div>
        </div>
        <div className="gfr-figure">
          <span className="muted">GFR ล่าสุด</span>
          <div><b>{p.latestGfr ? num(p.latestGfr.value, 1) : '–'}</b></div>
          <div className={p.gfrChangePct !== null && p.gfrChangePct <= -10 ? 'down' : 'muted'}>{pct(p.gfrChangePct)} จากครั้งก่อน</div>
          <div style={{ marginTop: 6 }}>ระยะ <Stage stage={p.stage} /></div>
          {p.stage && <div style={{ fontSize: "0.9rem", maxWidth: 220, marginLeft: "auto" }}>{LABELS.ckdStage[p.stage].meaning}</div>}
          <div className="muted" style={{ fontSize: '0.85rem' }}>{p.latestGfr ? `ตรวจ ${thDate(p.latestGfr.collectedAt)}` : 'ยังไม่มีผล GFR'}</div>
        </div>
      </div>

      <DischargePanel p={p} />

      <div className="tabs" role="tablist">
        {TABS.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>
      <div role="tabpanel" style={{ marginTop: 12 }}>
        {tab === 'visits' && <Visits id={p.id} />}
        {tab === 'labs' && <Labs id={p.id} />}
        {tab === 'medications' && <Medications id={p.id} />}
        {tab === 'drps' && <Drps id={p.id} />}
      </div>
    </>
  );
}
