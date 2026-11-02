import { describe, expect, it } from 'vitest';
import { appointmentStatus, urgency, type UrgencyInput } from '../src/domain/urgency';
import { DEFAULT_RULES } from '../src/domain/rules';

const base: UrgencyInput = {
  stage: '2',
  gfrChangePct: 0,
  gfrFlags: [],
  latestPotassium: null,
  latestSbp: null,
  appointment: 'scheduled',
  latestVisit: { medicationTaking: 'correct', herbalOrPainkiller: false },
};

describe('urgency', () => {
  it('is green when no condition applies', () => {
    expect(urgency(base, DEFAULT_RULES)).toEqual({ color: 'green', reasons: [] });
  });

  it('is red for stage 4–5', () => {
    const r = urgency({ ...base, stage: '4' }, DEFAULT_RULES);
    expect(r.color).toBe('red');
    expect(r.reasons).toContain('CKD ระยะ 4');
  });

  it('is red when GFR fell more than 25%', () => {
    const r = urgency({ ...base, gfrChangePct: -30 }, DEFAULT_RULES);
    expect(r.color).toBe('red');
    expect(r.reasons).toContain('GFR ลดลง 30.0% (มากกว่า 25%)');
  });

  it('is yellow when GFR fell 10–25%', () => {
    expect(urgency({ ...base, gfrChangePct: -10 }, DEFAULT_RULES).color).toBe('yellow');
    expect(urgency({ ...base, gfrChangePct: -9.9 }, DEFAULT_RULES).color).toBe('green');
  });

  it('is red for high potassium, low blood pressure or a missed appointment', () => {
    expect(urgency({ ...base, latestPotassium: 5.8 }, DEFAULT_RULES).color).toBe('red');
    expect(urgency({ ...base, latestSbp: 85 }, DEFAULT_RULES).color).toBe('red');
    expect(urgency({ ...base, appointment: 'missed' }, DEFAULT_RULES).color).toBe('red');
  });

  it('is yellow for stage 3, herbal/painkiller use, incorrect taking, or missing/stale GFR', () => {
    expect(urgency({ ...base, stage: '3a' }, DEFAULT_RULES).color).toBe('yellow');
    expect(urgency({ ...base, latestVisit: { medicationTaking: 'correct', herbalOrPainkiller: true } }, DEFAULT_RULES).color).toBe('yellow');
    expect(urgency({ ...base, latestVisit: { medicationTaking: 'incorrect', herbalOrPainkiller: false } }, DEFAULT_RULES).color).toBe('yellow');
    expect(urgency({ ...base, stage: null, gfrFlags: ['missing'] }, DEFAULT_RULES).color).toBe('yellow');
    expect(urgency({ ...base, gfrFlags: ['stale'] }, DEFAULT_RULES).color).toBe('yellow');
  });

  it('takes the worst color and keeps every reason', () => {
    const r = urgency({ ...base, stage: '3b', appointment: 'missed' }, DEFAULT_RULES);
    expect(r.color).toBe('red');
    expect(r.reasons).toEqual(['เลยวันนัด', 'CKD ระยะ 3b']);
  });
});

describe('appointmentStatus', () => {
  const today = new Date('2026-11-02');

  it('is none without an appointment', () => {
    expect(appointmentStatus(null, today, DEFAULT_RULES)).toBe('none');
  });

  it('is missed when the date has passed', () => {
    expect(appointmentStatus(new Date('2026-11-01'), today, DEFAULT_RULES)).toBe('missed');
  });

  it('is upcoming within the reminder window, including today', () => {
    expect(appointmentStatus(new Date('2026-11-02'), today, DEFAULT_RULES)).toBe('upcoming');
    expect(appointmentStatus(new Date('2026-11-09'), today, DEFAULT_RULES)).toBe('upcoming');
  });

  it('is scheduled when further away', () => {
    expect(appointmentStatus(new Date('2026-11-10'), today, DEFAULT_RULES)).toBe('scheduled');
  });
});
