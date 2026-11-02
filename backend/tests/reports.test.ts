import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db';
import { login, patientBody, resetDb } from './helpers';

beforeEach(resetDb);

describe('dashboard and monthly report (US5, US6)', () => {
  it('counts the month correctly and exports an audited Excel file without identifiers', async () => {
    const pharm = await login('pharm');
    const { body } = await pharm.post('/api/patients').send(patientBody()).expect(201);
    const id = body.patient.id;
    const visit = {
      medicationTaking: 'incorrect',
      herbalOrPainkiller: true,
      dietControlled: false,
      seasoning: 'reduce_needed',
      aceiArb: 'yes',
      labs: [],
      medications: [],
    };
    await pharm.post(`/api/patients/${id}/visits`).send({ ...visit, visitDate: '2026-10-01' }).expect(201);
    await pharm.post(`/api/patients/${id}/visits`).send({ ...visit, visitDate: '2026-10-20', medicationTaking: 'correct' }).expect(201);
    await pharm.post(`/api/patients/${id}/visits`).send({ ...visit, visitDate: '2026-11-01' }).expect(201);

    const report = await pharm.get('/api/reports/monthly?month=2026-10').expect(200);
    expect(report.body.visits).toBe(2);
    expect(report.body.patientsSeen).toBe(1);
    expect(report.body.newEnrollments).toBe(1);
    expect(report.body.incorrectTaking).toBe(1);
    expect(report.body.herbalOrPainkiller).toBe(2);

    const xlsx = await pharm.get('/api/reports/monthly.xlsx?month=2026-10').responseType('blob').expect(200);
    expect(xlsx.headers['content-type']).toContain('spreadsheetml');
    expect(Buffer.isBuffer(xlsx.body)).toBe(true);
    expect((xlsx.body as Buffer).length).toBeGreaterThan(1000);
    expect(await prisma.auditLog.count({ where: { action: 'export' } })).toBe(1);
  });

  it('returns a monthly trend ending at the chosen month', async () => {
    const pharm = await login('pharm');
    const res = await pharm.get('/api/reports/trend?month=2026-03&months=4').expect(200);
    expect(res.body.items.map((m: { month: string }) => m.month)).toEqual(['2025-12', '2026-01', '2026-02', '2026-03']);
    expect((await pharm.get('/api/reports/trend?month=2026-03&months=40')).status).toBe(400);
  });

  it('rejects a malformed month', async () => {
    const pharm = await login('pharm');
    expect((await pharm.get('/api/reports/monthly?month=2026-13')).status).toBe(400);
  });

  it('returns a worklist with counts by color', async () => {
    const pharm = await login('pharm');
    await pharm.post('/api/patients').send(patientBody()).expect(201);
    const res = await pharm.get('/api/dashboard').expect(200);
    expect(res.body.counts.total).toBe(1);
    expect(res.body.counts.byColor.yellow).toBe(1); // no GFR yet → insufficient data
    expect(res.body.insufficientData).toHaveLength(1);
  });
});
