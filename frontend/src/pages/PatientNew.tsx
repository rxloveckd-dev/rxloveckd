import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { isValidThaiNationalId, patientCreateSchema, patientUpdateSchema } from '@rx/shared';
import { ApiError, usePatient, usePatientMutation, type PatientProfile } from '../api';
import { Choice, ErrorState, Field, Loading, Section } from '../components/ui';
import { DateInput } from '../components/DateInput';
import { todayIso } from '../format';
import { Icon } from '../components/Icon';

const EMPTY = {
  nationalId: '',
  hn: '',
  title: '',
  firstName: '',
  lastName: '',
  birthDate: '',
  sex: '' as '' | 'male' | 'female',
  ckdCause: '',
  enrolledAt: todayIso(),
  notes: '',
};
type FormState = typeof EMPTY;

const fromProfile = (p: PatientProfile): FormState => ({
  nationalId: '',
  hn: p.hn,
  title: p.title,
  firstName: p.firstName,
  lastName: p.lastName,
  birthDate: p.birthDate.slice(0, 10),
  sex: p.sex,
  ckdCause: p.ckdCause ?? '',
  enrolledAt: p.enrolledAt.slice(0, 10),
  notes: p.notes ?? '',
});

/** ลงทะเบียนผู้ป่วย (/patients/new) */
export function PatientNew() {
  return <PatientForm initial={EMPTY} />;
}

/** แก้ไขข้อมูลผู้ป่วย (/patients/:id/edit) */
export function PatientEdit() {
  const { id = '' } = useParams();
  const { data, isLoading, error } = usePatient(id);
  if (isLoading) return <Loading />;
  if (error || !data) return <ErrorState error={error} />;
  return <PatientForm initial={fromProfile(data.patient)} patient={data.patient} />;
}

function PatientForm({ initial, patient }: { initial: FormState; patient?: PatientProfile }) {
  const navigate = useNavigate();
  const editing = !!patient;
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = usePatientMutation<unknown, { patient: PatientProfile }>(
    patient?.id ?? null,
    editing ? `/patients/${patient.id}` : '/patients',
    editing ? 'PATCH' : 'POST',
  );
  const set = (k: keyof FormState) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const { nationalId: _nid, ...rest } = form;
    const body = editing ? rest : form;
    const parsed = (editing ? patientUpdateSchema : patientCreateSchema).safeParse(body);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) next[String(i.path[0])] ??= i.message;
      setErrors(next);
      return;
    }
    setErrors({});
    try {
      const res = await save.mutateAsync(body);
      navigate(`/patients/${res.patient.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.field) setErrors({ [err.field]: err.message });
      else setErrors({ form: err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ' });
    }
  }

  const idOk = form.nationalId.replace(/[\s-]/g, '').length === 13 && isValidThaiNationalId(form.nationalId);

  return (
    <form onSubmit={submit} noValidate>
      <h1>{editing ? 'แก้ไขข้อมูลผู้ป่วย' : 'ลงทะเบียนผู้ป่วย'}</h1>
      <Section title="ข้อมูลผู้ป่วย">
        <div className="grid-2">
          <Field label="เลขบัตรประชาชน 13 หลัก" htmlFor="nid" error={errors.nationalId}>
            {editing ? (
              <input id="nid" value={patient.nationalIdMasked} disabled title="แก้ไขเลขบัตรประชาชนไม่ได้" />
            ) : (
              <>
                <input id="nid" inputMode="numeric" value={form.nationalId} onChange={(e) => set('nationalId')(e.target.value)} />
                {idOk && <span className="up" style={{ fontSize: '0.85rem' }}>เลขบัตรถูกต้อง</span>}
              </>
            )}
          </Field>
          <Field label="HN" htmlFor="hn" error={errors.hn}>
            <input id="hn" value={form.hn} onChange={(e) => set('hn')(e.target.value)} />
          </Field>
          <div className="name-row">
            <Field label="คำนำหน้า" htmlFor="title" error={errors.title}>
              <select id="title" value={form.title} onChange={(e) => set('title')(e.target.value)}>
                <option value="">เลือก</option>
                {['นาย', 'นาง', 'นางสาว', 'ด.ช.', 'ด.ญ.'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="ชื่อ" htmlFor="fn" error={errors.firstName}>
              <input id="fn" value={form.firstName} onChange={(e) => set('firstName')(e.target.value)} />
            </Field>
            <Field label="นามสกุล" htmlFor="ln" error={errors.lastName}>
              <input id="ln" value={form.lastName} onChange={(e) => set('lastName')(e.target.value)} />
            </Field>
          </div>
          <Field label="เพศ (ใช้คำนวณ eGFR)" error={errors.sex}>
            <Choice name="sex" value={form.sex} options={[['male', 'ชาย'], ['female', 'หญิง']]} onChange={(v) => set('sex')(v)} />
          </Field>
          <Field label="วันเกิด" htmlFor="bd" error={errors.birthDate}>
            <DateInput id="bd" value={form.birthDate} onChange={set('birthDate')} />
          </Field>
          <Field label="วันที่เข้าโครงการ" htmlFor="en" error={errors.enrolledAt}>
            <input id="en" type="date" value={form.enrolledAt} onChange={(e) => set('enrolledAt')(e.target.value)} />
          </Field>
          <Field label="สาเหตุโรคไต (ถ้าทราบ)" htmlFor="cause">
            <input id="cause" value={form.ckdCause} onChange={(e) => set('ckdCause')(e.target.value)} placeholder="เช่น เบาหวาน ความดันโลหิตสูง" />
          </Field>
          <Field label="หมายเหตุ" htmlFor="notes">
            <input id="notes" value={form.notes} onChange={(e) => set('notes')(e.target.value)} />
          </Field>
        </div>
      </Section>
      {errors.form && <div className="alert" role="alert" style={{ marginTop: 14 }}>{errors.form}</div>}
      <div className="row" style={{ marginTop: 18 }}>
        <button className="btn" disabled={save.isPending}>
          <Icon name="save" />
          {save.isPending ? 'กำลังบันทึก…' : editing ? 'บันทึกการแก้ไข' : 'บันทึกผู้ป่วย'}
        </button>
        <button type="button" className="btn secondary" onClick={() => navigate(-1)}><Icon name="x" />ยกเลิก</button>
      </div>
    </form>
  );
}
