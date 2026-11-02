import { Router } from 'express';
import { z } from 'zod';
import {
  drpCreateSchema,
  drpDecisionSchema,
  labCreateSchema,
  labHistory,
  medicationCreateSchema,
  patientCreateSchema,
  patientUpdateSchema,
  visitCreateSchema,
  type ClinicalRules,
} from '@rx/shared';
import { prisma } from '../db';
import { audit } from '../audit';
import { CLINICAL, requireRole } from '../auth';
import { notFound } from '../errors';
import { activeRules } from '../services/rules';
import { listSummaries, STATUS_INCLUDE, toSummary } from '../services/patients';

const listQuery = z.object({
  q: z.string().trim().optional(),
  stage: z.enum(['1', '2', '3a', '3b', '4', '5']).optional(),
  color: z.enum(['green', 'yellow', 'orange', 'red']).optional(),
  appointment: z.enum(['upcoming', 'missed']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

async function findPatientOr404(id: string) {
  const patient = await prisma.patient.findUnique({ where: { id }, include: STATUS_INCLUDE });
  if (!patient) throw notFound('ผู้ป่วย');
  return patient;
}

function profileResponse(p: Awaited<ReturnType<typeof findPatientOr404>>, rules: ClinicalRules) {
  return {
    ...toSummary(p, rules, new Date()),
    birthDate: p.birthDate,
    enrolledAt: p.enrolledAt,
    ckdCause: p.ckdCause,
    notes: p.notes,
  };
}

export function patientsRouter(): Router {
  const r = Router();
  r.use(requireRole(...CLINICAL));

  r.get('/patients', async (req, res) => {
    const q = listQuery.parse(req.query);
    const rules = await activeRules();
    let items = await listSummaries(rules, new Date());
    if (q.q) {
      const needle = q.q.toLowerCase();
      items = items.filter((p) => `${p.hn} ${p.firstName} ${p.lastName}`.toLowerCase().includes(needle));
    }
    if (q.stage) items = items.filter((p) => p.stage === q.stage);
    if (q.color) items = items.filter((p) => p.color === q.color);
    if (q.appointment) items = items.filter((p) => p.appointment === q.appointment);
    const total = items.length;
    const start = (q.page - 1) * q.pageSize;
    res.json({ items: items.slice(start, start + q.pageSize), total, page: q.page, pageSize: q.pageSize, rules });
  });

  r.post('/patients', async (req, res) => {
    const data = patientCreateSchema.parse(req.body);
    const created = await prisma.patient.create({ data: { ...data, responsiblePharmacistId: req.user!.id } });
    await audit(req, 'create', 'patient', created.id);
    const p = await findPatientOr404(created.id);
    res.status(201).json({ patient: profileResponse(p, await activeRules()) });
  });

  r.get('/patients/:id', async (req, res) => {
    const p = await findPatientOr404(req.params.id);
    await audit(req, 'view', 'patient', p.id);
    res.json({ patient: profileResponse(p, await activeRules()) });
  });

  r.patch('/patients/:id', async (req, res) => {
    await findPatientOr404(req.params.id);
    const data = patientUpdateSchema.parse(req.body);
    await prisma.patient.update({ where: { id: req.params.id }, data });
    await audit(req, 'update', 'patient', req.params.id);
    const p = await findPatientOr404(req.params.id);
    res.json({ patient: profileResponse(p, await activeRules()) });
  });

  // ---- labs
  r.get('/patients/:id/labs', async (req, res) => {
    await findPatientOr404(req.params.id);
    const labs = await prisma.labResult.findMany({ where: { patientId: req.params.id } });
    res.json({ items: labHistory(labs, await activeRules(), new Date()) });
  });

  r.post('/patients/:id/labs', async (req, res) => {
    await findPatientOr404(req.params.id);
    const data = labCreateSchema.parse(req.body);
    const lab = await prisma.labResult.create({ data: { ...data, patientId: req.params.id } });
    await audit(req, 'create', 'lab', lab.id);
    res.status(201).json({ lab });
  });

  // ---- visits (paper form replacement)
  r.get('/patients/:id/visits', async (req, res) => {
    await findPatientOr404(req.params.id);
    const visits = await prisma.visit.findMany({
      where: { patientId: req.params.id },
      include: { pharmacist: { select: { displayName: true } }, labs: true },
      orderBy: { visitNo: 'desc' },
    });
    res.json({
      items: visits.map(({ pharmacist, ...v }) => ({ ...v, pharmacistName: pharmacist.displayName })),
    });
  });

  r.post('/patients/:id/visits', async (req, res) => {
    await findPatientOr404(req.params.id);
    const { labs, medications, ...data } = visitCreateSchema.parse(req.body);
    const visit = await prisma.$transaction(async (tx) => {
      const last = await tx.visit.findFirst({ where: { patientId: req.params.id }, orderBy: { visitNo: 'desc' } });
      const v = await tx.visit.create({
        data: { ...data, patientId: req.params.id, visitNo: (last?.visitNo ?? 0) + 1, pharmacistId: req.user!.id },
      });
      for (const lab of labs) await tx.labResult.create({ data: { ...lab, patientId: req.params.id, visitId: v.id } });
      for (const med of medications) await tx.medication.create({ data: { ...med, patientId: req.params.id, visitId: v.id } });
      return v;
    });
    await audit(req, 'create', 'visit', visit.id);
    res.status(201).json({ visit });
  });

  // ---- medications
  r.get('/patients/:id/medications', async (req, res) => {
    await findPatientOr404(req.params.id);
    const items = await prisma.medication.findMany({
      where: { patientId: req.params.id },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ items });
  });

  r.post('/patients/:id/medications', async (req, res) => {
    await findPatientOr404(req.params.id);
    const data = medicationCreateSchema.parse(req.body);
    const med = await prisma.medication.create({ data: { ...data, patientId: req.params.id } });
    await audit(req, 'create', 'medication', med.id);
    res.status(201).json({ medication: med });
  });

  r.patch('/medications/:id', async (req, res) => {
    const { status } = z.object({ status: z.enum(['active', 'stopped']) }).parse(req.body);
    const exists = await prisma.medication.findUnique({ where: { id: req.params.id } });
    if (!exists) throw notFound('รายการยา');
    const med = await prisma.medication.update({ where: { id: req.params.id }, data: { status } });
    await audit(req, 'update', 'medication', med.id);
    res.json({ medication: med });
  });

  // ---- DRPs: recommendation and prescriber decision are separate fields (FR-011)
  const drpView = async (id: string) => {
    const d = await prisma.drp.findUnique({ where: { id }, include: { pharmacist: { select: { displayName: true } } } });
    if (!d) throw notFound('DRP');
    const decidedBy = d.decidedById
      ? await prisma.user.findUnique({ where: { id: d.decidedById }, select: { displayName: true } })
      : null;
    const { pharmacist, ...rest } = d;
    return { ...rest, pharmacistName: pharmacist.displayName, decidedByName: decidedBy?.displayName ?? null };
  };

  r.get('/patients/:id/drps', async (req, res) => {
    await findPatientOr404(req.params.id);
    const rows = await prisma.drp.findMany({ where: { patientId: req.params.id }, orderBy: { recordedAt: 'desc' } });
    res.json({ items: await Promise.all(rows.map((d) => drpView(d.id))) });
  });

  r.post('/patients/:id/drps', async (req, res) => {
    await findPatientOr404(req.params.id);
    const data = drpCreateSchema.parse(req.body);
    const drp = await prisma.drp.create({ data: { ...data, patientId: req.params.id, pharmacistId: req.user!.id } });
    await audit(req, 'create', 'drp', drp.id);
    res.status(201).json({ drp: await drpView(drp.id) });
  });

  r.patch('/drps/:id/decision', async (req, res) => {
    const data = drpDecisionSchema.parse(req.body);
    await drpView(req.params.id);
    await prisma.drp.update({
      where: { id: req.params.id },
      data: {
        ...data,
        decidedById: req.user!.id,
        decidedAt: new Date(),
        status: data.prescriberDecision === 'pending' ? 'open' : 'closed',
      },
    });
    await audit(req, 'update', 'drp', req.params.id);
    res.json({ drp: await drpView(req.params.id) });
  });

  return r;
}
