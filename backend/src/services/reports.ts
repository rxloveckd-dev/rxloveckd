import { prisma } from '../db';

export function monthRange(month: string): { from: Date; to: Date } {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return { from: new Date(Date.UTC(y, m - 1, 1)), to: new Date(Date.UTC(y, m, 1)) };
}

export interface MonthlySummary {
  month: string;
  visits: number;
  patientsSeen: number;
  newEnrollments: number;
  incorrectTaking: number;
  herbalOrPainkiller: number;
  dietUncontrolled: number;
  seasoningReduceNeeded: number;
  drps: number;
  drpsAccepted: number;
  drpsByCategory: Record<string, number>;
}

/** Aggregate counts only; no patient identifiers (FR-025). */
export async function monthlySummary(month: string): Promise<MonthlySummary> {
  const { from, to } = monthRange(month);
  const inMonth = { gte: from, lt: to };
  const visits = await prisma.visit.findMany({
    where: { visitDate: inMonth },
    select: { patientId: true, medicationTaking: true, herbalOrPainkiller: true, dietControlled: true, seasoning: true },
  });
  const drps = await prisma.drp.findMany({
    where: { recordedAt: inMonth },
    select: { category: true, prescriberDecision: true },
  });
  const drpsByCategory: Record<string, number> = {};
  for (const d of drps) drpsByCategory[d.category] = (drpsByCategory[d.category] ?? 0) + 1;

  return {
    month,
    visits: visits.length,
    patientsSeen: new Set(visits.map((v) => v.patientId)).size,
    newEnrollments: await prisma.patient.count({ where: { enrolledAt: inMonth } }),
    incorrectTaking: visits.filter((v) => v.medicationTaking === 'incorrect').length,
    herbalOrPainkiller: visits.filter((v) => v.herbalOrPainkiller).length,
    dietUncontrolled: visits.filter((v) => !v.dietControlled).length,
    seasoningReduceNeeded: visits.filter((v) => v.seasoning === 'reduce_needed').length,
    drps: drps.length,
    drpsAccepted: drps.filter((d) => d.prescriberDecision === 'accepted' || d.prescriberDecision === 'modified').length,
    drpsByCategory,
  };
}
