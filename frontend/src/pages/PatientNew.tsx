import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { isValidThaiNationalId, patientCreateSchema } from '@rx/shared';
import { ApiError, usePatientMutation, type PatientProfile } from '../api';
import { Choice, Field, Section } from '../components/ui';
import { todayIso } from '../format';

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

export function PatientNew() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = usePatientMutation<unknown, { patient: PatientProfile }>(null, '/patients');
  const set = (k: keyof typeof EMPTY) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = patientCreateSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) next[String(i.path[0])] ??= i.message;
      setErrors(next);
      return;
    }
    setErrors({});
    try {
      const res = await create.mutateAsync(form);
      navigate(`/patients/${res.patient.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.field) setErrors({ [err.field]: err.message });
      else setErrors({ form: err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ' });
    }
  }

  const idOk = form.nationalId.replace(/[\s-]/g, '').length === 13 && isValidThaiNationalId(form.nationalId);

  return (
    <form onSubmit={submit} noValidate>
      <h1>ลงทะเบียนผู้ป่วย</h1>
      <Section title="ข้อมูลผู้ป่วย">
        <div className="grid-2">
          <Field label="เลขบัตรประชาชน 13 หลัก" htmlFor="nid" error={errors.nationalId}>
            <input id="nid" inputMode="numeric" value={form.nationalId} onChange={(e) => set('nationalId')(e.target.value)} />
            {idOk && <span className="up" style={{ fontSize: '0.85rem' }}>เลขบัตรถูกต้อง</span>}
          </Field>
          <Field label="HN" htmlFor="hn" error={errors.hn}>
            <input id="hn" value={form.hn} onChange={(e) => set('hn')(e.target.value)} />
          </Field>
          <Field label="คำนำหน้า" htmlFor="title" error={errors.title}>
            <select id="title" value={form.title} onChange={(e) => set('title')(e.target.value)}>
              <option value="">เลือก</option>
              {['นาย', 'นาง', 'นางสาว', 'ด.ช.', 'ด.ญ.'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="เพศ (ใช้คำนวณ eGFR)" error={errors.sex}>
            <Choice name="sex" value={form.sex} options={[['male', 'ชาย'], ['female', 'หญิง']]} onChange={(v) => set('sex')(v)} />
          </Field>
          <Field label="ชื่อ" htmlFor="fn" error={errors.firstName}>
            <input id="fn" value={form.firstName} onChange={(e) => set('firstName')(e.target.value)} />
          </Field>
          <Field label="นามสกุล" htmlFor="ln" error={errors.lastName}>
            <input id="ln" value={form.lastName} onChange={(e) => set('lastName')(e.target.value)} />
          </Field>
          <Field label="วันเกิด" htmlFor="bd" error={errors.birthDate}>
            <input id="bd" type="date" value={form.birthDate} onChange={(e) => set('birthDate')(e.target.value)} />
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
        <button className="btn" disabled={create.isPending}>{create.isPending ? 'กำลังบันทึก…' : 'บันทึกผู้ป่วย'}</button>
        <button type="button" className="btn secondary" onClick={() => navigate(-1)}>ยกเลิก</button>
      </div>
    </form>
  );
}
