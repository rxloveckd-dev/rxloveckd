import type { ClinicalRules } from './rules';

export type LabTest = 'gfr' | 'scr' | 'hba1c' | 'albumin' | 'potassium' | 'sbp' | 'dbp';
export type DataFlag = 'missing' | 'stale' | 'implausible';

/** Physiologically plausible ranges; values outside are shown for checking, never used silently. */
export const PLAUSIBLE_RANGE: Record<LabTest, [number, number]> = {
  gfr: [0, 200],
  scr: [0.1, 25],
  hba1c: [3, 20],
  albumin: [0, 10000],
  potassium: [1.5, 9],
  sbp: [50, 260],
  dbp: [30, 160],
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function labFlags(
  test: LabTest,
  latest: { value: number; collectedAt: Date } | null,
  today: Date,
  rules: ClinicalRules,
): DataFlag[] {
  if (!latest) return ['missing'];
  const flags: DataFlag[] = [];
  const [min, max] = PLAUSIBLE_RANGE[test];
  if (latest.value < min || latest.value > max) flags.push('implausible');
  if ((today.getTime() - latest.collectedAt.getTime()) / DAY_MS > rules.gfrStaleDays) flags.push('stale');
  return flags;
}
