import { beforeEach, describe, expect, it } from 'vitest';
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

  it('rejects a next appointment before the visit date', async () => {
    const { pharm, id } = await newPatient();
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
