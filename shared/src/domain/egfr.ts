export type Sex = 'male' | 'female';

export interface EgfrInput {
  scrMgDl: number;
  ageYears: number;
  sex: Sex;
}

export const EGFR_METHOD = 'CKD-EPI 2021 (creatinine)';

/**
 * CKD-EPI 2021 race-free creatinine equation (research.md R3).
 * Returns null for inputs outside the adult equation's validity rather than guessing.
 */
export function ckdEpi2021({ scrMgDl, ageYears, sex }: EgfrInput): number | null {
  if (!(scrMgDl > 0) || !(ageYears >= 18)) return null;
  const kappa = sex === 'female' ? 0.7 : 0.9;
  const alpha = sex === 'female' ? -0.241 : -0.302;
  const ratio = scrMgDl / kappa;
  const egfr =
    142 *
    Math.min(ratio, 1) ** alpha *
    Math.max(ratio, 1) ** -1.2 *
    0.9938 ** ageYears *
    (sex === 'female' ? 1.012 : 1);
  return Math.round(egfr * 10) / 10;
}
