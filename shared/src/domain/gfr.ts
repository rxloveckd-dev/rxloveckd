import type { CkdStage, ClinicalRules } from './rules';

export function ckdStage(gfr: number | null, rules: ClinicalRules): CkdStage | null {
  if (gfr === null || Number.isNaN(gfr)) return null;
  const match = rules.stageCutoffs.find((c) => gfr >= c.minGfr);
  return match ? match.stage : null;
}

/** Percent change of the current GFR versus the previous one; negative means a fall. */
export function gfrChangePercent(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}
