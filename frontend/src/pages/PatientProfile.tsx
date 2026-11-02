import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DRP_CATEGORY, LABELS, SEVERITY, type DrpCreate } from '@rx/shared';
import { ApiError, usePatient, usePatientList, usePatientMutation } from '../api';
import { Empty, ErrorState, Field, Loading, Section, Stage, Urgency } from '../components/ui';
import { num, pct, thDate } from '../format';

interface VisitRow {
  id: string;
  visitNo: number;
  visitDate: string;
  medicationTaking: 'correct' | 'incorrect';
  herbalOrPainkiller: boolean;
  herbalDetail: string | null;
  dietControlled: boolean;
  seasoning: 'reduce_needed' | 'adjusted';
  furtherAdjustments: string | null;
  nextAppointment: string | null;
  aceiArb: 'yes' | 'no' | null;
  aceiArbNoReason: string | null;
  pharmacistName: string;
}
interface LabRow {
  id: string;
  test: keyof typeof LABELS.labTest;
  value: number;
  unit: string;
  collectedAt: string;
  source: string;
  previous: number | null;
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

function Visits({ id }: { id: string }) {
  const { data, isLoading, error } = usePatientList<VisitRow>(id, 'visits');
  if (isLoading) return <Loading />;
  if (error || !data) return <ErrorState error={error} />;
  if (!data.items.length) return <Empty>ยังไม่มีการติดตาม <Link to={`/patients/${id}/visits/new`}>บันทึกครั้งแรก</Link></Empty>;
  return (
    <div className="grid-2">
      {data.items.map((v) => (
        <Section key={v.id} title={`ติดตามครั้งที่ ${v.visitNo}`} action={<span className="muted">{thDate(v.visitDate)}</span>}>
          <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 14px' }}>
            <dt className="muted">ยากลุ่ม ACEI/ARB</dt>
            <dd style={{ margin: 0 }}>
              {v.aceiArb ? LABELS.aceiArb[v.aceiArb] : '–'}
              {v.aceiArb === 'no' && v.aceiArbNoReason ? ` เพราะ${v.aceiArbNoReason}` : ''}
            </dd>
            <dt className="muted">การกินยา</dt>
            <dd style={{ margin: 0 }} className={v.medicationTaking === 'incorrect' ? 'down' : ''}>{LABELS.medicationTaking[v.medicationTaking]}</dd>
            <dt className="muted">ยาสมุนไพร/ยาแก้ปวด</dt>
            <dd style={{ margin: 0 }} className={v.herbalOrPainkiller ? 'down' : ''}>
              {v.herbalOrPainkiller ? `กิน${v.herbalDetail ? `: ${v.herbalDetail}` : ''}` : 'ไม่กิน'}
            </dd>
            <dt className="muted">อาหาร</dt>
            <dd style={{ margin: 0 }}>{v.dietControlled ? 'คุม' : 'ไม่คุม'}</dd>
            <dt className="muted">เครื่องปรุง</dt>
            <dd style={{ margin: 0 }}>{LABELS.seasoning[v.seasoning]}</dd>
            <dt className="muted">สิ่งที่ต้องปรับเพิ่ม</dt>
            <dd style={{ margin: 0 }}>{v.furtherAdjustments || '–'}</dd>
            <dt className="muted">นัดครั้งต่อไป</dt>
            <dd style={{ margin: 0 }}>{thDate(v.nextAppointment)}</dd>
            <dt className="muted">เภสัชกร</dt>
            <dd style={{ margin: 0 }}>{v.pharmacistName}</dd>
          </dl>
        </Section>
      ))}
    </div>
  );
}

function Labs({ id }: { id: string }) {
  const { data, isLoading, error } = usePatientList<LabRow>(id, 'labs');
  if (isLoading) return <Loading />;
  if (error || !data) return <ErrorState error={error} />;
  if (!data.items.length) return <Empty>ยังไม่มีผลแล็บ บันทึกได้ในหน้าการติดตาม</Empty>;
  return (
    <div className="table-wrap">
      <table className="stack">
        <thead>
          <tr><th>รายการ</th><th>วันที่ตรวจ</th><th className="num">ค่า</th><th>หน่วย</th><th className="num">ครั้งก่อน</th><th className="num">เปลี่ยนแปลง</th><th>ที่มา</th></tr>
        </thead>
        <tbody>
          {data.items.map((l) => (
            <tr key={l.id}>
              <td className="lead">{LABELS.labTest[l.test] ?? l.test}</td>
              <td data-label="วันที่ตรวจ">{thDate(l.collectedAt)}</td>
              <td data-label="ค่า" className="num">
                {num(l.value, 2)}
                {l.flags.includes('implausible') && <div className="down" style={{ fontSize: '0.8rem' }}>ค่าผิดปกติ ตรวจสอบ</div>}
              </td>
              <td data-label="หน่วย">{l.unit}</td>
              <td data-label="ครั้งก่อน" className="num">{num(l.previous, 2)}</td>
              <td data-label="เปลี่ยนแปลง" className={`num ${l.changePct !== null && l.changePct <= -10 ? 'down' : ''}`}>{l.test === 'gfr' ? pct(l.changePct) : ''}</td>
              <td data-label="ที่มา" className="muted">{l.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted" style={{ fontSize: '0.85rem' }}>% เปลี่ยนแปลงคำนวณจากผล GFR ครั้งก่อนที่ใช้หน่วยเดียวกัน</p>
    </div>
  );
}

function Medications({ id }: { id: string }) {
  const { data, isLoading, error } = usePatientList<MedRow>(id, 'medications');
  const update = usePatientMutation<{ medId: string; status: string }, unknown>(id, (b) => `/medications/${b.medId}`, 'PATCH');
  if (isLoading) return <Loading />;
  if (error || !data) return <ErrorState error={error} />;
  if (!data.items.length) return <Empty>ยังไม่มีรายการยา บันทึกได้ในหน้าการติดตาม</Empty>;
  return (
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
                <button
                  className="btn secondary small"
                  disabled={update.isPending}
                  onClick={() => update.mutate({ medId: m.id, status: m.status === 'active' ? 'stopped' : 'active' })}
                >
                  {m.status === 'active' ? 'บันทึกว่าหยุดยา' : 'กลับมาใช้'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DrpDecision({ patientId, drp }: { patientId: string; drp: DrpRow }) {
  const [decision, setDecision] = useState<string>('accepted');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const save = usePatientMutation<unknown, unknown>(patientId, `/drps/${drp.id}/decision`, 'PATCH');
  return (
    <form
      className="row"
      onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        try {
          await save.mutateAsync({ prescriberDecision: decision, prescriberReason: reason || null });
        } catch (err) {
          setError(err instanceof ApiError ? err.message : 'บันทึกไม่สำเร็จ');
        }
      }}
    >
      <select aria-label="การตัดสินใจของแพทย์" value={decision} onChange={(e) => setDecision(e.target.value)} className="field" style={{ padding: 6 }}>
        <option value="accepted">ยอมรับ</option>
        <option value="modified">ยอมรับแบบปรับ</option>
        <option value="declined">ไม่ยอมรับ</option>
      </select>
      <input aria-label="เหตุผลของแพทย์" placeholder="เหตุผลของแพทย์" value={reason} onChange={(e) => setReason(e.target.value)} style={{ font: 'inherit', padding: 6, flex: 1 }} />
      <button className="btn small" disabled={save.isPending}>บันทึกผลจากแพทย์</button>
      {error && <span className="down">{error}</span>}
    </form>
  );
}

function Drps({ id }: { id: string }) {
  const { data, isLoading, error } = usePatientList<DrpRow>(id, 'drps');
  const add = usePatientMutation<DrpCreate, unknown>(id, `/patients/${id}/drps`);
  const [form, setForm] = useState({ category: 'adherence', severity: 'medium', description: '', drugs: '', recommendation: '' });
  const [formError, setFormError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    try {
      await add.mutateAsync(form as DrpCreate);
      setForm({ ...form, description: '', drugs: '', recommendation: '' });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'บันทึกไม่สำเร็จ');
    }
  }

  return (
    <>
      <Section title="บันทึก DRP ใหม่">
        <form onSubmit={submit} className="grid-2">
          <Field label="ประเภท" htmlFor="cat">
            <select id="cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {DRP_CATEGORY.map((c) => <option key={c} value={c}>{LABELS.drpCategory[c]}</option>)}
            </select>
          </Field>
          <Field label="ความรุนแรง" htmlFor="sev">
            <select id="sev" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
              {SEVERITY.map((s) => <option key={s} value={s}>{LABELS.severity[s]}</option>)}
            </select>
          </Field>
          <Field label="รายละเอียดปัญหา" htmlFor="desc">
            <textarea id="desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="คำแนะนำของเภสัชกร" htmlFor="rec">
            <textarea id="rec" value={form.recommendation} onChange={(e) => setForm({ ...form, recommendation: e.target.value })} />
          </Field>
          <Field label="ยาที่เกี่ยวข้อง" htmlFor="drugs">
            <input id="drugs" value={form.drugs} onChange={(e) => setForm({ ...form, drugs: e.target.value })} />
          </Field>
          <div className="row" style={{ alignSelf: 'end' }}>
            <button className="btn" disabled={add.isPending}>บันทึก DRP</button>
            {formError && <span className="down">{formError}</span>}
          </div>
        </form>
      </Section>
      {isLoading ? <Loading /> : error || !data ? <ErrorState error={error} /> : data.items.length === 0 ? (
        <Empty>ยังไม่มี DRP</Empty>
      ) : (
        data.items.map((d) => (
          <Section key={d.id} title={LABELS.drpCategory[d.category]} action={<span className="muted">{thDate(d.recordedAt)}</span>}>
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
          </Section>
        ))
      )}
    </>
  );
}

export function PatientProfile() {
  const { id = '' } = useParams();
  const { data, isLoading, error } = usePatient(id);
  const [tab, setTab] = useState<Tab>('visits');
  if (isLoading) return <Loading />;
  if (error || !data) return <ErrorState error={error} />;
  const p = data.patient;

  return (
    <>
      <div className="patient-head">
        <div>
          <div className="row">
            <h1>{p.title}{p.firstName} {p.lastName}</h1>
            <Urgency color={p.color} />
          </div>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            HN {p.hn}, เลขบัตร {p.nationalIdMasked}, อายุ {p.age} ปี, {LABELS.sex[p.sex]}, เข้าโครงการ {thDate(p.enrolledAt)}
          </p>
          {p.reasons.length > 0 && (
            <ul className="reasons">
              {p.reasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
          )}
          <div className="row" style={{ marginTop: 12 }}>
            <Link className="btn" to={`/patients/${p.id}/visits/new`}>บันทึกการติดตามครั้งใหม่</Link>
            <span className="muted">นัดครั้งต่อไป {thDate(p.nextAppointment)}{p.appointment === 'missed' ? ' (เลยนัด)' : ''}</span>
          </div>
        </div>
        <div className="gfr-figure">
          <span className="muted">GFR ล่าสุด</span>
          <div><b>{p.latestGfr ? num(p.latestGfr.value, 1) : '–'}</b></div>
          <div className={p.gfrChangePct !== null && p.gfrChangePct <= -10 ? 'down' : 'muted'}>{pct(p.gfrChangePct)} จากครั้งก่อน</div>
          <div style={{ marginTop: 6 }}>ระยะ <Stage stage={p.stage} /></div>
          <div className="muted" style={{ fontSize: '0.85rem' }}>{p.latestGfr ? `ตรวจ ${thDate(p.latestGfr.collectedAt)}` : 'ยังไม่มีผล GFR'}</div>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>
      <div role="tabpanel" style={{ marginTop: 12 }}>
        {tab === 'visits' && <Visits id={p.id} />}
        {tab === 'labs' && <Section title="ผลแล็บ"><Labs id={p.id} /></Section>}
        {tab === 'medications' && <Section title="ยาผู้ป่วย"><Medications id={p.id} /></Section>}
        {tab === 'drps' && <Drps id={p.id} />}
      </div>
    </>
  );
}
