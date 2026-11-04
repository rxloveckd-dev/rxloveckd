import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { gfrChangePercent, LABELS, potassiumOutOfRange, visitCreateSchema, type UrgencyColor } from '@rx/shared';
import { ApiError, usePatient, usePatientMutation } from '../api';
import { Choice, ErrorState, Field, Loading, Section, UrgencyPicker } from '../components/ui';
import { AlbuminInput } from '../components/AlbuminInput';
import { DateInput } from '../components/DateInput';
import { enterToNext } from '../components/enterToNext';
import { num, pct, todayIso } from '../format';
import { Icon } from '../components/Icon';
import { LeftoverEditor, leftoverPayload, type LeftoverRow } from '../components/LeftoverEditor';

interface MedDraft {
  drugName: string;
  strength: string;
  directions: string;
  drugClass: keyof typeof LABELS.drugClass;
}

const blankMed = (): MedDraft => ({ drugName: '', strength: '', directions: '', drugClass: 'other' });

/** Mirrors the clinic's paper form: labs, patient medicines, then the note items. */
export function VisitNew() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const patient = usePatient(id);
  const save = usePatientMutation<unknown, unknown>(id, `/patients/${id}/visits`);

  const [visitDate, setVisitDate] = useState(todayIso());
  const [labDate, setLabDate] = useState(todayIso());
  const [gfr, setGfr] = useState('');
  const [hba1c, setHba1c] = useState('');
  const [albumin, setAlbumin] = useState('');
  const [potassium, setPotassium] = useState('');
  const [sbp, setSbp] = useState('');
  const [dbp, setDbp] = useState('');
  const [aceiArb, setAceiArb] = useState<'' | 'yes' | 'no'>('');
  const [aceiArbNoReason, setAceiArbNoReason] = useState('');
  const [doctorChange, setDoctorChange] = useState<'' | 'yes' | 'no'>('');
  const [doctorChangeDetail, setDoctorChangeDetail] = useState('');
  // Note starts at the usual answers; staff only change what is abnormal.
  const [taking, setTaking] = useState<'' | 'correct' | 'incorrect'>('correct');
  const [takingDetail, setTakingDetail] = useState('');
  const [leftovers, setLeftovers] = useState<LeftoverRow[]>([]);
  const [aceiArbDrug, setAceiArbDrug] = useState<'' | 'enalapril' | 'losartan'>('');
  const [dietDetail, setDietDetail] = useState('');
  const [seasoningDetail, setSeasoningDetail] = useState('');
  const [herbal, setHerbal] = useState<'' | 'yes' | 'no'>('no');
  const [herbalDetail, setHerbalDetail] = useState('');
  const [diet, setDiet] = useState<'' | 'yes' | 'no'>('yes');
  const [seasoning, setSeasoning] = useState<'' | 'reduce_needed' | 'adjusted'>('adjusted');
  const [further, setFurther] = useState('');
  const [next, setNext] = useState('');
  const [seePharmacist, setSeePharmacist] = useState<'' | 'yes' | 'no'>('');
  // null until the pharmacist picks: the patient keeps the color they already have.
  const [pickedColor, setPickedColor] = useState<UrgencyColor | '' | null>(null);
  const [meds, setMeds] = useState<MedDraft[]>([]);
  const [error, setError] = useState('');

  if (patient.isLoading) return <Loading />;
  if (patient.error || !patient.data) return <ErrorState error={patient.error} />;
  const p = patient.data.patient;

  const gfrNum = gfr ? Number(gfr) : null;
  const change = gfrChangePercent(gfrNum, p.latestGfr?.value ?? null);
  const potassiumHigh = potassium.trim() !== '' && potassiumOutOfRange(Number(potassium));
  const urgencyColor = pickedColor ?? p.color ?? '';

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const labs = [
      gfr && { test: 'gfr', value: gfr, unit: LABELS.labUnit.gfr, collectedAt: labDate },
      hba1c && { test: 'hba1c', value: hba1c, unit: LABELS.labUnit.hba1c, collectedAt: labDate },
      albumin.trim() && { test: 'albumin', value: 0, valueText: albumin, unit: LABELS.labUnit.albumin, collectedAt: labDate },
      potassium && { test: 'potassium', value: potassium, unit: LABELS.labUnit.potassium, collectedAt: labDate },
      sbp && { test: 'sbp', value: sbp, unit: LABELS.labUnit.sbp, collectedAt: labDate },
      dbp && { test: 'dbp', value: dbp, unit: LABELS.labUnit.dbp, collectedAt: labDate },
    ].filter(Boolean);
    const body = {
      visitDate,
      medicationTaking: taking || undefined,
      medicationTakingDetail: taking === 'incorrect' ? takingDetail || null : null,
      leftoverMeds: leftoverPayload(leftovers),
      herbalOrPainkiller: herbal === '' ? undefined : herbal === 'yes',
      herbalDetail: herbal === 'yes' ? herbalDetail : null,
      dietControlled: diet === '' ? undefined : diet === 'yes',
      dietDetail: diet === 'no' ? dietDetail || null : null,
      seasoning: seasoning || undefined,
      seasoningDetail: seasoning === 'reduce_needed' ? seasoningDetail || null : null,
      furtherAdjustments: further || null,
      nextAppointment: next || null,
      nextSeePharmacist: next ? seePharmacist || null : null,
      urgencyColor: urgencyColor || null,
      doctorMedChange: doctorChange || null,
      doctorMedChangeDetail: doctorChange === 'yes' ? doctorChangeDetail : null,
      aceiArb: aceiArb || undefined,
      aceiArbNoReason: aceiArb === 'no' ? aceiArbNoReason : null,
      aceiArbDrug: aceiArb === 'yes' ? aceiArbDrug || null : null,
      labs,
      medications: meds.filter((m) => m.drugName.trim()),
    };
    const parsed = visitCreateSchema.safeParse(body);
    if (!parsed.success) {
      const specific = parsed.error.issues.find((i) =>
        ['visitDate', 'labs', 'nextAppointment', 'nextSeePharmacist', 'doctorMedChangeDetail', 'aceiArb', 'aceiArbNoReason', 'aceiArbDrug', 'leftoverMeds'].includes(String(i.path[0])),
      );
      setError(specific?.message ?? 'กรุณาเลือกให้ครบทุกข้อในส่วน Note (การกินยา ยาสมุนไพร อาหาร เครื่องปรุง)');
      return;
    }
    try {
      await save.mutateAsync(body);
      navigate(`/patients/${id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'บันทึกไม่สำเร็จ');
    }
  }

  return (
    <form onSubmit={submit} onKeyDown={enterToNext} noValidate>
      <div className="page-head">
        <div>
          <h1>บันทึกการติดตาม</h1>
          <p className="muted" style={{ margin: 0 }}>{p.title}{p.firstName} {p.lastName}, HN {p.hn}, อายุ {p.age} ปี</p>
        </div>
        <Field label="วันที่มา" htmlFor="vd">
          <DateInput id="vd" value={visitDate} onChange={setVisitDate} />
        </Field>
      </div>

      <Section title="ผลแล็บ">
        <div className="grid-3">
          <Field label="วันที่ตรวจ / วัดความดัน" htmlFor="ld"><DateInput id="ld" value={labDate} onChange={setLabDate} /></Field>
          <Field label="GFR (mL/min/1.73m²)" htmlFor="gfr">
            <input id="gfr" inputMode="decimal" value={gfr} onChange={(e) => setGfr(e.target.value)} />
          </Field>
          <Field label="เพิ่ม/ลด เทียบครั้งก่อน">
            <div className={change !== null && change <= -10 ? 'down' : ''} style={{ paddingTop: 8 }}>
              {change === null ? (p.latestGfr ? 'กรอก GFR เพื่อคำนวณ' : 'ไม่มีผลครั้งก่อน') : `${pct(change)} (ครั้งก่อน ${num(p.latestGfr?.value, 1)})`}
            </div>
          </Field>
          <Field label={`HbA1c (%) (${LABELS.labRange.hba1c})`} htmlFor="a1c"><input id="a1c" inputMode="decimal" value={hba1c} onChange={(e) => setHba1c(e.target.value)} /></Field>
          <Field label="Albumin (mg/g)" htmlFor="alb">
            <AlbuminInput id="alb" value={albumin} onChange={setAlbumin} />
          </Field>
          <Field label={`Potassium (mmol/L) (${LABELS.labRange.potassium})`} htmlFor="k" error={potassiumHigh ? 'นอกช่วงปกติ' : undefined}>
            <input id="k" inputMode="decimal" className={potassiumHigh ? 'out-of-range' : undefined} value={potassium} onChange={(e) => setPotassium(e.target.value)} />
          </Field>
          <Field label="ความดันโลหิต BP (mmHg)">
            <div className="bp">
              <input aria-label="ความดันตัวบน" inputMode="numeric" placeholder="ตัวบน" value={sbp} onChange={(e) => setSbp(e.target.value)} />
              <span aria-hidden="true">/</span>
              <input aria-label="ความดันตัวล่าง" inputMode="numeric" placeholder="ตัวล่าง" value={dbp} onChange={(e) => setDbp(e.target.value)} />
            </div>
          </Field>
        </div>
      </Section>

      <Section title="ยาผู้ป่วย" action={<button type="button" className="btn secondary small" onClick={() => setMeds([...meds, blankMed()])}><Icon name="plus" />เพิ่มยา</button>}>
        <div className="grid-2" style={{ marginBottom: 14 }}>
          <Field label="ยากลุ่ม ACEI/ARB">
            <Choice name="aceiArb" value={aceiArb} options={[['yes', 'มี'], ['no', 'ไม่มี']]} onChange={setAceiArb} />
          </Field>
          {aceiArb === 'yes' && (
            <Field label="ยาที่ใช้ (เลือก 1 ชนิด)">
              <Choice name="aceiArbDrug" value={aceiArbDrug} options={[['enalapril', 'Enalapril'], ['losartan', 'Losartan']]} onChange={setAceiArbDrug} />
            </Field>
          )}
          {aceiArb === 'no' && (
            <Field label="ไม่มีเพราะ" htmlFor="anr">
              <input id="anr" value={aceiArbNoReason} onChange={(e) => setAceiArbNoReason(e.target.value)} placeholder="เช่น โพแทสเซียมสูง แพทย์หยุดยา ไม่มีข้อบ่งใช้" />
            </Field>
          )}
          <Field label="แพทย์มีการปรับเปลี่ยนยา">
            <Choice name="doctorChange" value={doctorChange} options={[['yes', 'มี'], ['no', 'ไม่มี']]} onChange={setDoctorChange} />
            {doctorChange === 'yes' && <input aria-label="ระบุการปรับเปลี่ยนยา" placeholder="ระบุการปรับเปลี่ยนยา" value={doctorChangeDetail} onChange={(e) => setDoctorChangeDetail(e.target.value)} className="detail-input" />}
          </Field>
        </div>
        {meds.length === 0 && <p className="muted" style={{ margin: 0 }}>ถ้ามียาใหม่หรือเปลี่ยนยา กด "เพิ่มยา" ยาเดิมดูได้ในหน้าผู้ป่วย</p>}
        {meds.map((m, i) => (
          <div key={i} className="grid-3" style={{ marginBottom: 10 }}>
            <Field label="ชื่อยา" htmlFor={`dn${i}`}><input id={`dn${i}`} value={m.drugName} onChange={(e) => setMeds(meds.map((x, j) => (j === i ? { ...x, drugName: e.target.value } : x)))} /></Field>
            <Field label="ความแรง" htmlFor={`st${i}`}><input id={`st${i}`} value={m.strength} onChange={(e) => setMeds(meds.map((x, j) => (j === i ? { ...x, strength: e.target.value } : x)))} /></Field>
            <Field label="วิธีใช้" htmlFor={`di${i}`}><input id={`di${i}`} value={m.directions} onChange={(e) => setMeds(meds.map((x, j) => (j === i ? { ...x, directions: e.target.value } : x)))} /></Field>
            <Field label="กลุ่มยา" htmlFor={`dc${i}`}>
              <select id={`dc${i}`} value={m.drugClass} onChange={(e) => setMeds(meds.map((x, j) => (j === i ? { ...x, drugClass: e.target.value as MedDraft['drugClass'] } : x)))}>
                {Object.entries(LABELS.drugClass).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
          </div>
        ))}
        <LeftoverEditor idPrefix="lo" rows={leftovers} onChange={setLeftovers} />
      </Section>

      <Section title="Note">
        <div className="grid-2">
          <Field label="การกินยา">
            <Choice name="taking" danger={['incorrect']} value={taking} options={[['correct', 'ถูกต้อง'], ['incorrect', 'ไม่ถูกต้อง']]} onChange={setTaking} />
            {taking === 'incorrect' && <input aria-label="ระบุการกินยาที่ไม่ถูกต้อง" placeholder="ระบุ เช่น กินยาไม่ตรงเวลา ลืมกินยามื้อเย็น" value={takingDetail} onChange={(e) => setTakingDetail(e.target.value)} className="detail-input warn" />}
          </Field>
          <Field label="กินยาสมุนไพร/ยาแก้ปวด">
            <Choice name="herbal" danger={['yes']} value={herbal} options={[['yes', 'กิน'], ['no', 'ไม่กิน']]} onChange={setHerbal} />
            {herbal === 'yes' && <input aria-label="รายละเอียดยาสมุนไพร/ยาแก้ปวด" placeholder="ชื่อยา ซื้อจากที่ไหน" value={herbalDetail} onChange={(e) => setHerbalDetail(e.target.value)} className="detail-input warn" />}
          </Field>
          <Field label="อาหาร">
            <Choice name="diet" danger={['no']} value={diet} options={[['yes', 'คุมอาหาร'], ['no', 'ไม่คุม']]} onChange={setDiet} />
            {diet === 'no' && <input aria-label="ระบุเรื่องอาหาร" placeholder="ระบุ เช่น กินของหวาน ผลไม้รสหวาน" value={dietDetail} onChange={(e) => setDietDetail(e.target.value)} className="detail-input warn" />}
          </Field>
          <Field label="เครื่องปรุง">
            <Choice name="seasoning" danger={['reduce_needed']} value={seasoning} options={[['reduce_needed', 'ควรปรับลด'], ['adjusted', 'ปรับลดแล้ว']]} onChange={setSeasoning} />
            {seasoning === 'reduce_needed' && <input aria-label="ระบุเครื่องปรุงที่ควรลด" placeholder="ระบุ เช่น น้ำปลา ผงชูรส" value={seasoningDetail} onChange={(e) => setSeasoningDetail(e.target.value)} className="detail-input warn" />}
          </Field>
        </div>
        <div className="grid-2" style={{ marginTop: 14 }}>
          <Field label="Note เภสัชกร" htmlFor="fu"><textarea id="fu" value={further} onChange={(e) => setFurther(e.target.value)} /></Field>
          <Field label="นัดครั้งต่อไป" htmlFor="na"><DateInput id="na" value={next} min={visitDate} onChange={setNext} /></Field>
          <Field label="ครั้งถัดไป">
            <Choice name="seePharmacist" value={seePharmacist} options={[['yes', LABELS.nextSeePharmacist.yes], ['no', LABELS.nextSeePharmacist.no]]} onChange={setSeePharmacist} />
          </Field>
          <Field label="สีความเร่งด่วน">
            <UrgencyPicker name="urgency" value={urgencyColor} onChange={setPickedColor} />
          </Field>
        </div>
      </Section>

      {error && <div className="alert" role="alert" style={{ marginTop: 14 }}>{error}</div>}
      <div className="row" style={{ marginTop: 18 }}>
        <button className="btn" disabled={save.isPending}><Icon name="save" />{save.isPending ? 'กำลังบันทึก…' : 'บันทึกการติดตาม'}</button>
        <button type="button" className="btn secondary" onClick={() => navigate(-1)}><Icon name="x" />ยกเลิก</button>
      </div>
    </form>
  );
}
