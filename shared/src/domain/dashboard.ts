/** The last `n` months as YYYY-MM, oldest first, ending with the month of `today`. */
export function lastMonths(n: number, today: Date): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}

export interface AceiArbCoverage {
  yes: number;
  no: number;
  /** No visit yet, or the latest visit was recorded before the question existed. */
  unknown: number;
}

/** ACEI/ARB status of each active patient, taken from their latest visit. */
export function aceiArbCoverage(
  visits: { patientId: string; visitDate: Date; visitNo: number; aceiArb: string | null }[],
  activePatientIds: string[],
): AceiArbCoverage {
  const latest = new Map<string, (typeof visits)[number]>();
  for (const v of visits) {
    const cur = latest.get(v.patientId);
    const newer =
      !cur ||
      v.visitDate.getTime() > cur.visitDate.getTime() ||
      (v.visitDate.getTime() === cur.visitDate.getTime() && v.visitNo > cur.visitNo);
    if (newer) latest.set(v.patientId, v);
  }
  const result: AceiArbCoverage = { yes: 0, no: 0, unknown: 0 };
  for (const id of activePatientIds) {
    const status = latest.get(id)?.aceiArb;
    if (status === 'yes') result.yes += 1;
    else if (status === 'no') result.no += 1;
    else result.unknown += 1;
  }
  return result;
}
