import { describe, expect, it } from 'vitest';
import { ckdStage, gfrChangePercent } from '../src/domain/gfr';
import { labFlags } from '../src/domain/dataQuality';
import { DEFAULT_RULES } from '../src/domain/rules';

describe('ckdStage', () => {
  it.each([
    [120, '1'],
    [90, '1'],
    [89.9, '2'],
    [60, '2'],
    [59, '3a'],
    [45, '3a'],
    [44, '3b'],
    [30, '3b'],
    [29, '4'],
    [15, '4'],
    [14.9, '5'],
    [3, '5'],
  ])('GFR %s → stage %s', (gfr, stage) => {
    expect(ckdStage(gfr, DEFAULT_RULES)).toBe(stage);
  });

  it('returns null when GFR is missing', () => {
    expect(ckdStage(null, DEFAULT_RULES)).toBeNull();
  });
});

describe('gfrChangePercent', () => {
  it('computes the change versus the previous value', () => {
    expect(gfrChangePercent(38, 42)).toBeCloseTo(-9.52, 2);
    expect(gfrChangePercent(50, 40)).toBeCloseTo(25, 5);
  });

  it('returns null without a usable previous value', () => {
    expect(gfrChangePercent(40, null)).toBeNull();
    expect(gfrChangePercent(40, 0)).toBeNull();
    expect(gfrChangePercent(null, 40)).toBeNull();
  });
});

describe('labFlags', () => {
  const today = new Date('2026-11-02');

  it('flags missing results', () => {
    expect(labFlags('gfr', null, today, DEFAULT_RULES)).toEqual(['missing']);
  });

  it('flags implausible values', () => {
    expect(labFlags('potassium', { value: 25, collectedAt: new Date('2026-10-30') }, today, DEFAULT_RULES))
      .toContain('implausible');
  });

  it('flags stale results older than the configured window', () => {
    expect(labFlags('gfr', { value: 40, collectedAt: new Date('2026-01-01') }, today, DEFAULT_RULES))
      .toEqual(['stale']);
  });

  it('flags an implausible HbA1c', () => {
    expect(labFlags('hba1c', { value: 45, collectedAt: new Date('2026-10-30') }, today, DEFAULT_RULES))
      .toContain('implausible');
    expect(labFlags('hba1c', { value: 7.2, collectedAt: new Date('2026-10-30') }, today, DEFAULT_RULES))
      .toEqual([]);
  });

  it('returns no flags for a recent plausible value', () => {
    expect(labFlags('gfr', { value: 40, collectedAt: new Date('2026-10-01') }, today, DEFAULT_RULES))
      .toEqual([]);
  });
});
