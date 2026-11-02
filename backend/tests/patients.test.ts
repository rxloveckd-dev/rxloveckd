import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db';
import { login, patientBody, resetDb } from './helpers';

beforeEach(resetDb);

describe('patients (US1)', () => {
  it('registers a patient and masks the national ID in the response', async () => {
    const pharm = await login('pharm');
    const res = await pharm.post('/api/patients').send(patientBody());
    expect(res.status).toBe(201);
    expect(res.body.patient.nationalIdMasked).toBe('X-XXXX-XXXX7-03-0');
    expect(JSON.stringify(res.body)).not.toContain('1101700207030');
    expect(await prisma.auditLog.count({ where: { action: 'create', entity: 'patient' } })).toBe(1);
  });

  it('rejects an invalid national ID with a Thai message', async () => {
    const pharm = await login('pharm');
    const res = await pharm.post('/api/patients').send(patientBody({ nationalId: '1101700207031' }));
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('เลขบัตรประชาชนไม่ถูกต้อง');
  });

  it('blocks duplicate national ID and duplicate HN (FR-002)', async () => {
    const pharm = await login('pharm');
    await pharm.post('/api/patients').send(patientBody()).expect(201);
    const dupId = await pharm.post('/api/patients').send(patientBody({ hn: '999' }));
    expect(dupId.status).toBe(409);
    expect(dupId.body.error.message).toBe('เลขบัตรประชาชนนี้ลงทะเบียนแล้ว');
    const dupHn = await pharm.post('/api/patients').send(patientBody({ nationalId: '3100600445813' }));
    expect(dupHn.status).toBe(409);
  });

  it('returns derived stage, GFR change and urgency with reasons on the profile', async () => {
    const pharm = await login('pharm');
    const { body } = await pharm.post('/api/patients').send(patientBody()).expect(201);
    const id = body.patient.id;
    await pharm.post(`/api/patients/${id}/labs`).send({ test: 'gfr', value: 50, unit: 'mL/min/1.73m²', collectedAt: '2026-08-01' }).expect(201);
    await pharm.post(`/api/patients/${id}/labs`).send({ test: 'gfr', value: 35, unit: 'mL/min/1.73m²', collectedAt: '2026-10-25' }).expect(201);

    const res = await pharm.get(`/api/patients/${id}`).expect(200);
    expect(res.body.patient.stage).toBe('3b');
    expect(res.body.patient.gfrChangePct).toBeCloseTo(-30, 5);
    expect(res.body.patient.color).toBe('red');
    expect(res.body.patient.reasons).toContain('GFR ลดลง 30.0% (มากกว่า 25%)');
    expect(await prisma.auditLog.count({ where: { action: 'view', entity: 'patient' } })).toBe(1);
  });

  it('filters the list by stage and color', async () => {
    const pharm = await login('pharm');
    const { body } = await pharm.post('/api/patients').send(patientBody()).expect(201);
    await pharm.post(`/api/patients/${body.patient.id}/labs`).send({ test: 'gfr', value: 20, unit: 'mL/min/1.73m²', collectedAt: '2026-10-25' });
    expect((await pharm.get('/api/patients?stage=4')).body.items).toHaveLength(1);
    expect((await pharm.get('/api/patients?stage=2')).body.items).toHaveLength(0);
    expect((await pharm.get('/api/patients?color=orange')).body.items).toHaveLength(1); // stage 4 = orange
    expect((await pharm.get('/api/patients?color=red')).body.items).toHaveLength(0);
  });

  it('discharges a patient with a reason, lists them separately, and can undo it', async () => {
    const pharm = await login('pharm');
    const { body } = await pharm.post('/api/patients').send(patientBody()).expect(201);
    const id = body.patient.id;

    const noNote = await pharm.post(`/api/patients/${id}/discharge`).send({ dischargeCode: '12', dischargeDate: '2026-11-02' });
    expect(noNote.status).toBe(400);
    expect(noNote.body.error.message).toBe('กรุณาระบุสาเหตุเพิ่มเติม');

    const res = await pharm.post(`/api/patients/${id}/discharge`).send({ dischargeCode: '02', dischargeDate: '2026-11-02' }).expect(200);
    expect(res.body.patient.programStatus).toBe('discharged');
    expect(res.body.patient.dischargeCode).toBe('02');
    expect((await pharm.get('/api/patients')).body.total).toBe(0);
    expect((await pharm.get('/api/patients?status=discharged')).body.total).toBe(1);

    const month = await pharm.get('/api/reports/monthly?month=2026-11').expect(200);
    expect(month.body.dischargesByReason).toEqual({ '02': 1 });

    const back = await pharm.post(`/api/patients/${id}/reactivate`).expect(200);
    expect(back.body.patient.programStatus).toBe('active');
    expect(back.body.patient.dischargeCode).toBeNull();
    expect(await prisma.auditLog.count({ where: { entity: 'patient', action: 'update' } })).toBe(2);
  });

  it('uses opaque IDs, never HN or national ID, in record addresses', async () => {
    const pharm = await login('pharm');
    const { body } = await pharm.post('/api/patients').send(patientBody()).expect(201);
    expect(body.patient.id).not.toMatch(/000123|1101700207030/);
    expect((await pharm.get('/api/patients/000123')).status).toBe(404);
  });
});
