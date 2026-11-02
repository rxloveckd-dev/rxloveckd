import { monthRange, summarizeMonth, type MonthlySummary } from '@rx/shared';
import { prisma } from '../db';

export async function monthlySummary(month: string): Promise<MonthlySummary> {
  const { from, to } = monthRange(month);
  const inMonth = { gte: from, lt: to };
  const [visits, drps, newEnrollments, discharges] = await Promise.all([
    prisma.visit.findMany({
      where: { visitDate: inMonth },
      select: { patientId: true, medicationTaking: true, herbalOrPainkiller: true, dietControlled: true, seasoning: true },
    }),
    prisma.drp.findMany({ where: { recordedAt: inMonth }, select: { category: true, prescriberDecision: true } }),
    prisma.patient.count({ where: { enrolledAt: inMonth } }),
    prisma.patient.findMany({
      where: { programStatus: 'discharged', dischargeDate: inMonth },
      select: { dischargeCode: true },
    }),
  ]);
  return summarizeMonth(month, visits, drps, newEnrollments, discharges);
}
