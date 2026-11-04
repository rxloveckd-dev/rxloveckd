import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db';
import { login, patientBody, resetDb } from './helpers';

beforeEach(resetDb);

const visitBody = (overrides: Record<string, unknown> = {}) => ({
  visitDate: '2026-10-01',
  medicationTaking: 'correct',
  herbalOrPainkiller: false,
  dietControlled: true,
  seasoning: 'adjusted',
  nextAppointment: '2026-11-05',
  nextSeePharmacist: 'yes',
  aceiArb: 'yes',
  aceiArbDrug: 'enalapril',
  labs: [{ test: 'gfr', value: 42, unit: 'mL/min/1.73m²', collectedAt: '2026-09-28' }],
  medications: [{ drugName: 'Enalapril', strength: '5 mg', directions: '1 เม็ด เช้า', drugClass: 'acei' }],
  ...overrides,
});
const LEFTOVER = [{ drugName: 'Amlodipine', strengthMg: '10', remaining: 12 }];
const LEFTOVER_JSON = JSON.stringify(LEFTOVER);
const drpBody = { category: 'adherence', severity: 'medium', description: 'ลืมกินยา', recommendation: 'ใช้กล่องแบ่งยา' };

async function setup() {
  const pharm = await login('pharm');
  const { body } = await pharm.post('/api/patients').send(patientBody()).expect(201);
  return { pharm, id: body.patient.id as string };
}

describe('edit and delete', () => {
  it('edits a patient', async () => {
    const { pharm, id } = await setup();
    const res = await pharm.patch(`/api/patients/${id}`).send({ firstName: 'แก้ไข' }).expect(200);
    expect(res.body.patient.firstName).toBe('แก้ไข');
  });

  it('lets only a supervisor delete a patient, together with all their records', async () => {
    const { pharm, id } = await setup();
    await pharm.post(`/api/patients/${id}/visits`).send(visitBody()).expect(201);
    await pharm.post(`/api/patients/${id}/drps`).send(drpBody).expect(201);

    expect((await pharm.delete(`/api/patients/${id}`)).status).toBe(403);
    const sup = await login('super');
    await sup.delete(`/api/patients/${id}`).expect(200);

    expect(await prisma.patient.count()).toBe(0);
    expect(await prisma.visit.count()).toBe(0);
    expect(await prisma.labResult.count()).toBe(0);
    expect(await prisma.medication.count()).toBe(0);
    expect(await prisma.drp.count()).toBe(0);
    expect(await prisma.auditLog.count({ where: { action: 'delete', entity: 'patient', entityId: id } })).toBe(1);
  });

  it('edits a visit and validates it like a new one', async () => {
    const { pharm, id } = await setup();
    const { body } = await pharm.post(`/api/patients/${id}/visits`).send(visitBody()).expect(201);
    const { labs: _l, medications: _m, ...fields } = visitBody();
    const bad = await pharm.patch(`/api/visits/${body.visit.id}`).send({ ...fields, aceiArb: 'no' });
    expect(bad.status).toBe(400);
    const ok = await pharm.patch(`/api/visits/${body.visit.id}`).send({ ...fields, medicationTaking: 'incorrect' }).expect(200);
    expect(ok.body.visit.medicationTaking).toBe('incorrect');
  });

  it('deletes a visit with its labs, keeps its medicines, and renumbers later visits', async () => {
    const { pharm, id } = await setup();
    const first = await pharm.post(`/api/patients/${id}/visits`).send(visitBody()).expect(201);
    await pharm.post(`/api/patients/${id}/visits`).send(visitBody({ visitDate: '2026-11-05', nextAppointment: null, labs: [], medications: [] })).expect(201);

    await pharm.delete(`/api/visits/${first.body.visit.id}`).expect(200);
    const visits = (await pharm.get(`/api/patients/${id}/visits`)).body.items;
    expect(visits).toHaveLength(1);
    expect(visits[0].visitNo).toBe(1);
    expect((await pharm.get(`/api/patients/${id}/labs`)).body.items).toHaveLength(0);
    const meds = (await pharm.get(`/api/patients/${id}/medications`)).body.items;
    expect(meds).toHaveLength(1);
    expect(meds[0].visitId).toBeNull();
  });

  it('edits and deletes a lab result', async () => {
    const { pharm, id } = await setup();
    const { body } = await pharm.post(`/api/patients/${id}/labs`).send({ test: 'gfr', value: 40, unit: 'mL/min/1.73m²', collectedAt: '2026-10-01' }).expect(201);
    const edited = await pharm.patch(`/api/labs/${body.lab.id}`).send({ test: 'gfr', value: 45, unit: 'mL/min/1.73m²', collectedAt: '2026-10-02' }).expect(200);
    expect(edited.body.lab.value).toBe(45);
    await pharm.delete(`/api/labs/${body.lab.id}`).expect(200);
    expect(await prisma.labResult.count()).toBe(0);
  });

  it('edits, stops and deletes a medicine', async () => {
    const { pharm, id } = await setup();
    const { body } = await pharm.post(`/api/patients/${id}/medications`).send({ drugName: 'Losartan', drugClass: 'arb' }).expect(201);
    const edited = await pharm.patch(`/api/medications/${body.medication.id}`).send({ drugName: 'Losartan', strength: '50 mg', drugClass: 'arb' }).expect(200);
    expect(edited.body.medication.strength).toBe('50 mg');
    const stopped = await pharm.patch(`/api/medications/${body.medication.id}`).send({ status: 'stopped' }).expect(200);
    expect(stopped.body.medication.status).toBe('stopped');
    expect(stopped.body.medication.drugClass).toBe('arb');
    await pharm.delete(`/api/medications/${body.medication.id}`).expect(200);
    expect(await prisma.medication.count()).toBe(0);
  });

  it('edits and deletes a DRP', async () => {
    const { pharm, id } = await setup();
    const { body } = await pharm.post(`/api/patients/${id}/drps`).send(drpBody).expect(201);
    const edited = await pharm.patch(`/api/drps/${body.drp.id}`).send({ ...drpBody, severity: 'high' }).expect(200);
    expect(edited.body.drp.severity).toBe('high');
    await pharm.delete(`/api/drps/${body.drp.id}`).expect(200);
    expect(await prisma.drp.count()).toBe(0);
  });

  it('saves the note details and drops a detail when its answer no longer asks for one', async () => {
    const { pharm, id } = await setup();
    const created = await pharm
      .post(`/api/patients/${id}/visits`)
      .send(visitBody({
        medicationTaking: 'incorrect', medicationTakingDetail: 'ลืมกินยามื้อเย็น',
        leftoverMeds: LEFTOVER,
        dietControlled: false, dietDetail: 'กินของหวาน',
        seasoning: 'reduce_needed', seasoningDetail: 'น้ำปลา',
      }))
      .expect(201);
    expect(created.body.visit).toMatchObject({ medicationTakingDetail: 'ลืมกินยามื้อเย็น', leftoverMeds: LEFTOVER_JSON, dietDetail: 'กินของหวาน', seasoningDetail: 'น้ำปลา' });

    const { labs: _l, medications: _m, ...fields } = visitBody();
    const edited = await pharm
      .patch(`/api/visits/${created.body.visit.id}`)
      .send({ ...fields, medicationTakingDetail: 'ลืมกินยามื้อเย็น', dietDetail: 'กินของหวาน', seasoningDetail: 'น้ำปลา', leftoverMeds: LEFTOVER })
      .expect(200);
    expect(edited.body.visit).toMatchObject({ medicationTakingDetail: null, dietDetail: null, seasoningDetail: null, leftoverMeds: LEFTOVER_JSON });
  });

  it('expands the HN shorthand and rejects an HN that is not 9 digits', async () => {
    const pharm = await login('pharm');
    const ok = await pharm.post('/api/patients').send(patientBody({ hn: '45/70' })).expect(201);
    expect(ok.body.patient.hn).toBe('450000070');
    const bad = await pharm.post('/api/patients').send(patientBody({ hn: '4500070' }));
    expect(bad.status).toBe(400);
    expect(bad.body.error.field).toBe('hn');
  });

  it('requires the ACEI/ARB drug when the patient has one, and checks leftover rows', async () => {
    const { pharm, id } = await setup();
    const noDrug = await pharm.post(`/api/patients/${id}/visits`).send(visitBody({ aceiArbDrug: null }));
    expect(noDrug.status).toBe(400);
    expect(noDrug.body.error.field).toBe('aceiArbDrug');

    const badCount = await pharm
      .post(`/api/patients/${id}/visits`)
      .send(visitBody({ leftoverMeds: [{ drugName: 'Amlodipine', strengthMg: '10', remaining: 'สิบ' }] }));
    expect(badCount.status).toBe(400);
    expect(badCount.body.error.field).toBe('leftoverMeds.0.remaining');

    const off = await pharm
      .post(`/api/patients/${id}/visits`)
      .send(visitBody({ aceiArb: 'no', aceiArbNoReason: 'โพแทสเซียมสูง', aceiArbDrug: 'losartan' }))
      .expect(201);
    expect(off.body.visit.aceiArbDrug).toBeNull();
  });

  it('returns 404 for records that do not exist', async () => {
    const { pharm } = await setup();
    expect((await pharm.delete('/api/labs/nope')).status).toBe(404);
    expect((await pharm.patch('/api/drps/nope').send(drpBody)).status).toBe(404);
  });
});
