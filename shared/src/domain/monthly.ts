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
  discharges: number;
  dischargesByReason: Record<string, number>;
}

export function monthRange(month: string): { from: Date; to: Date } {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return { from: new Date(Date.UTC(y, m - 1, 1)), to: new Date(Date.UTC(y, m, 1)) };
}

/** Aggregate counts only, no patient identifiers (FR-025). Inputs must already be limited to the month. */
export function summarizeMonth(
  month: string,
  visits: { patientId: string; medicationTaking: string; herbalOrPainkiller: boolean; dietControlled: boolean; seasoning: string }[],
  drps: { category: string; prescriberDecision: string }[],
  newEnrollments: number,
  discharges: { dischargeCode: string | null }[] = [],
): MonthlySummary {
  const drpsByCategory: Record<string, number> = {};
  for (const d of drps) drpsByCategory[d.category] = (drpsByCategory[d.category] ?? 0) + 1;
  const dischargesByReason: Record<string, number> = {};
  for (const d of discharges) {
    const code = d.dischargeCode ?? '12';
    dischargesByReason[code] = (dischargesByReason[code] ?? 0) + 1;
  }
  return {
    month,
    visits: visits.length,
    patientsSeen: new Set(visits.map((v) => v.patientId)).size,
    newEnrollments,
    incorrectTaking: visits.filter((v) => v.medicationTaking === 'incorrect').length,
    herbalOrPainkiller: visits.filter((v) => v.herbalOrPainkiller).length,
    dietUncontrolled: visits.filter((v) => !v.dietControlled).length,
    seasoningReduceNeeded: visits.filter((v) => v.seasoning === 'reduce_needed').length,
    drps: drps.length,
    drpsAccepted: drps.filter((d) => d.prescriberDecision === 'accepted' || d.prescriberDecision === 'modified').length,
    drpsByCategory,
    discharges: discharges.length,
    dischargesByReason,
  };
}
