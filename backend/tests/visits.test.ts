import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db';
import { login, patientBody, resetDb } from './helpers';

beforeEach(resetDb);

const visitBody = (overrides: Record<string, unknown> = {}) => ({
  visitDate: '2026-10-01',
  medicationTaking: 'incorrect',
  herbalOrPainkiller: true,
  herbalDetail: 'ยาแก้ปวดซื้อเอง',
  dietControlled: false,
  seasoning: 'reduce_needed',
  furtherAdjustments: 'ทบทวนวิธีกินยา',
  nextAppointment: '2026-11-05',
  nextSeePharmacist: 'yes',
  aceiArb: 'yes',
  aceiArbDrug: 'enalapril',
  labs: [{ test: 'gfr', value: 42, unit: 'mL/min/1.73m²', collectedAt: '2026-09-28' }],
  medications: [{ drugName: 'Enalapril', strength: '5 mg', directions: '1 เม็ด เช้า', drugClass: 'acei' }],
  ...overrides,
});

async function newPatient() {
  const pharm = await login('pharm');
  const { body } = await pharm.post('/api/patients').send(patientBody()).expect(201);
  return { pharm, id: body.patient.id as string };
}

describe('visits (US2)', () => {
  it('numbers visits per patient and saves labs and medications with the visit', async () => {
    const { pharm, id } = await newPatient();
    const first = await pharm.post(`/api/patients/${id}/visits`).send(visitBody()).expect(201);
    const second = await pharm.post(`/api/patients/${id}/visits`).send(visitBody({ visitDate: '2026-11-05', nextAppointment: null, labs: [], medications: [] })).expect(201);
    expect(first.body.visit.visitNo).toBe(1);
    expect(second.body.visit.visitNo).toBe(2);

    const visits = await pharm.get(`/api/patients/${id}/visits`).expect(200);
    expect(visits.body.items).toHaveLength(2);
    expect(visits.body.items[0].pharmacistName).toBe('ภก.ทดสอบ');
    expect((await pharm.get(`/api/patients/${id}/labs`)).body.items).toHaveLength(1);
    expect((await pharm.get(`/api/patients/${id}/medications`)).body.items).toHaveLength(1);
  });

  it('requires a reason when the patient is not on an ACEI/ARB', async () => {
    const { pharm, id } = await newPatient();
    const noReason = await pharm.post(`/api/patients/${id}/visits`).send(visitBody({ aceiArb: 'no' }));
    expect(noReason.status).toBe(400);
    expect(noReason.body.error.message).toBe('กรุณาระบุเหตุผลที่ไม่ได้รับยากลุ่ม ACEI/ARB');

    const ok = await pharm
      .post(`/api/patients/${id}/visits`)
      .send(visitBody({ aceiArb: 'no', aceiArbNoReason: 'โพแทสเซียมสูง แพทย์หยุดยา' }))
      .expect(201);
    expect(ok.body.visit.aceiArbNoReason).toBe('โพแทสเซียมสูง แพทย์หยุดยา');
  });

  it('stores HbA1c and blood pressure as lab results', async () => {
    const { pharm, id } = await newPatient();
    await pharm
      .post(`/api/patients/${id}/visits`)
      .send(
        visitBody({
          labs: [
            { test: 'hba1c', value: 7.2, unit: '%', collectedAt: '2026-09-28' },
            { test: 'sbp', value: 138, unit: 'mmHg', collectedAt: '2026-10-01' },
            { test: 'dbp', value: 84, unit: 'mmHg', collectedAt: '2026-10-01' },
          ],
        }),
      )
      .expect(201);
    const labs = await pharm.get(`/api/patients/${id}/labs`).expect(200);
    expect(labs.body.items.map((l: { test: string }) => l.test).sort()).toEqual(['dbp', 'hba1c', 'sbp']);
  });

  it('saves the clinic follow-up answers and shows the pharmacist color on the patient', async () => {
    const pharm = await login('pharm');
    const { body } = await pharm.post('/api/patients').send(patientBody()).expect(201);
    const id = body.patient.id;
    const saved = await pharm
      .post(`/api/patients/${id}/visits`)
      .send(
        visitBody({
          doctorMedChange: 'yes',
          doctorMedChangeDetail: 'เพิ่ม Losartan',
          urgencyColor: 'orange',
          labs: [{ test: 'albumin', value: 0, valueText: '30–300', unit: 'mg/g', collectedAt: '2026-09-28' }],
        }),
      )
      .expect(201);
    expect(saved.body.visit).toMatchObject({ doctorMedChangeDetail: 'เพิ่ม Losartan', urgencyColor: 'orange', nextSeePharmacist: 'yes' });
    const patient = (await pharm.get(`/api/patients/${id}`).expect(200)).body.patient;
    expect(patient).toMatchObject({ color: 'orange', nextSeePharmacist: 'yes' });
    const labs = (await pharm.get(`/api/patients/${id}/labs`).expect(200)).body.items;
    expect(labs[0]).toMatchObject({ test: 'albumin', valueText: '30–300' });
    await pharm.post(`/api/patients/${id}/labs`).send({ test: 'albumin', value: 0, valueText: '450', unit: 'mg/g', collectedAt: '2026-10-28' }).expect(201);
    const typed = (await pharm.get(`/api/patients/${id}/labs`).expect(200)).body.items[0];
    expect(typed).toMatchObject({ valueText: '450', previousText: '30–300' });
  });

  it('rejects a next appointment before the visit date', async () => {
    const { pharm, id } = await newPatient();
    const missingChoice = await pharm.post(`/api/patients/${id}/visits`).send(visitBody({ nextSeePharmacist: null }));
    expect(missingChoice.status).toBe(400);
    const noDetail = await pharm.post(`/api/patients/${id}/visits`).send(visitBody({ doctorMedChange: 'yes' }));
    expect(noDetail.status).toBe(400);
    const res = await pharm.post(`/api/patients/${id}/visits`).send(visitBody({ nextAppointment: '2026-09-01' }));
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('วันนัดครั้งต่อไปต้องไม่ก่อนวันที่มา');
  });
});

describe('DRPs (US2)', () => {
  it('keeps the prescriber decision separate from the pharmacist recommendation', async () => {
    const { pharm, id } = await newPatient();
    const drp = await pharm
      .post(`/api/patients/${id}/drps`)
      .send({ category: 'avoid_in_ckd', description: 'กิน NSAID', severity: 'medium', recommendation: 'หยุด NSAID' })
      .expect(201);
    const declinedNoReason = await pharm.patch(`/api/drps/${drp.body.drp.id}/decision`).send({ prescriberDecision: 'declined' });
    expect(declinedNoReason.status).toBe(400);

    const decided = await pharm
      .patch(`/api/drps/${drp.body.drp.id}/decision`)
      .send({ prescriberDecision: 'declined', prescriberReason: 'ผู้ป่วยปวดมาก' })
      .expect(200);
    expect(decided.body.drp.recommendation).toBe('หยุด NSAID');
    expect(decided.body.drp.prescriberDecision).toBe('declined');
    expect(decided.body.drp.decidedByName).toBe('ภก.ทดสอบ');
  });
});

describe('printing a visit', () => {
  it('records the print in the audit log', async () => {
    const { pharm, id } = await newPatient();
    const { body } = await pharm.post(`/api/patients/${id}/visits`).send(visitBody()).expect(201);

    await pharm.post(`/api/visits/${body.visit.id}/print`).send({}).expect(200);

    const log = await prisma.auditLog.findFirst({ where: { action: 'export', entity: 'visit' } });
    expect(log?.entityId).toBe(body.visit.id);
  });

  it('refuses an unknown visit and anyone who may not see patient data', async () => {
    const { pharm, id } = await newPatient();
    const { body } = await pharm.post(`/api/patients/${id}/visits`).send(visitBody()).expect(201);
    await pharm.post('/api/visits/missing/print').send({}).expect(404);

    const admin = await login('admin');
    await admin.post(`/api/visits/${body.visit.id}/print`).send({}).expect(403);
    expect(await prisma.auditLog.count({ where: { action: 'export', entity: 'visit' } })).toBe(0);
  });
});

describe('appointments calendar', () => {
  const postVisit = (pharm: Awaited<ReturnType<typeof login>>, id: string, overrides: Record<string, unknown>) =>
    pharm.post(`/api/patients/${id}/visits`).send(visitBody({ labs: [], medications: [], ...overrides })).expect(201);

  it('keeps a patient on the day they came and lists their next appointment too', async () => {
    const { pharm, id } = await newPatient();
    await postVisit(pharm, id, { visitDate: '2026-08-01', nextAppointment: '2026-09-07', nextSeePharmacist: 'yes' });
    await postVisit(pharm, id, { visitDate: '2026-09-07', nextAppointment: '2026-09-28', nextSeePharmacist: 'no' });

    const { body } = await pharm.get('/api/appointments?month=2026-09').expect(200);

    expect(body.items.map((a: { date: string; attendance: string; seePharmacist: string }) => [a.date, a.attendance, a.seePharmacist])).toEqual([
      ['2026-09-07', 'came', 'yes'],
      ['2026-09-28', 'missed', 'no'],
    ]);
    expect(body.items[0]).toMatchObject({ id, hn: '000000123', firstName: patientBody().firstName });
    expect(body.items[0].nationalId).toBeUndefined();
  });

  it('leaves out discharged patients', async () => {
    const { pharm, id } = await newPatient();
    await postVisit(pharm, id, { visitDate: '2026-08-01', nextAppointment: '2026-09-07' });
    await prisma.patient.update({ where: { id }, data: { programStatus: 'discharged' } });

    const { body } = await pharm.get('/api/appointments?month=2026-09').expect(200);

    expect(body.items).toEqual([]);
  });

  it('rejects a malformed month and non-clinical staff', async () => {
    const pharm = await login('pharm');
    expect((await pharm.get('/api/appointments?month=2026-13')).status).toBe(400);
    const admin = await login('admin');
    expect((await admin.get('/api/appointments?month=2026-09')).status).toBe(403);
  });
});
