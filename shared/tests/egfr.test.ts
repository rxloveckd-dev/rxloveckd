import { describe, expect, it } from 'vitest';
import { ckdEpi2021 } from '../src/domain/egfr';

describe('ckdEpi2021', () => {
  it('matches reference values (female 50 y, SCr 0.8 mg/dL ≈ 89.7)', () => {
    expect(ckdEpi2021({ scrMgDl: 0.8, ageYears: 50, sex: 'female' })).toBeCloseTo(89.7, 0);
  });

  it('matches reference values (male 60 y, SCr 1.5 mg/dL ≈ 53.0)', () => {
    expect(ckdEpi2021({ scrMgDl: 1.5, ageYears: 60, sex: 'male' })).toBeCloseTo(53.0, 0);
  });

  it('uses the low-creatinine branch (male 40 y, SCr 0.7 mg/dL ≈ 119.4)', () => {
    expect(ckdEpi2021({ scrMgDl: 0.7, ageYears: 40, sex: 'male' })).toBeCloseTo(119.4, 0);
  });

  it('returns null for missing or implausible input instead of guessing', () => {
    expect(ckdEpi2021({ scrMgDl: 0, ageYears: 50, sex: 'male' })).toBeNull();
    expect(ckdEpi2021({ scrMgDl: 1, ageYears: 15, sex: 'male' })).toBeNull();
  });
});
