import { describe, expect, it } from 'vitest';
import { appointmentStatus, followUpReasons, urgencyRank, type FollowUpInput } from '../src/domain/urgency';
import { derivePatientStatus } from '../src/domain/patientStatus';
import { potassiumOutOfRange } from '../src/domain/rules';
import { buddhistMonth, seePharmacistToday } from '../src/domain/dashboard';
import { DEFAULT_RULES } from '../src/domain/rules';

const base: FollowUpInput = {
  stage: '2',
  gfrChangePct: 0,
  gfrFlags: [],
  latestPotassium: null,
  latestSbp: null,
  appointment: 'scheduled',
  latestVisit: { medicationTaking: 'correct', herbalOrPainkiller: false },
};

describe('followUpReasons', () => {
  const reasons = (over: Partial<FollowUpInput>) => followUpReasons({ ...base, ...over }, DEFAULT_RULES);

  it('is empty when no condition applies', () => {
    expect(reasons({})).toEqual([]);
  });

  it('lists every reason, most serious first', () => {
    expect(reasons({ stage: '4', appointment: 'missed' })).toEqual(['เลยวันนัด', 'CKD ระยะ 4']);
    expect(reasons({ stage: '3b', appointment: 'missed' })).toEqual(['เลยวันนัด', 'CKD ระยะ 3b']);
  });

  it('reports a GFR fall, with the threshold when it is large', () => {
    expect(reasons({ gfrChangePct: -30 })).toContain('GFR ลดลง 30.0% (มากกว่า 25%)');
    expect(reasons({ gfrChangePct: -10 })).toEqual(['GFR ลดลง 10.0%']);
    expect(reasons({ gfrChangePct: -9.9 })).toEqual([]);
  });

  it('reports high potassium, low blood pressure, herbal use, incorrect taking and missing GFR', () => {
    expect(reasons({ latestPotassium: 5.8 })).toEqual(['โพแทสเซียมสูง 5.8 mmol/L']);
    expect(reasons({ latestSbp: 85 })).toEqual(['ความดันต่ำ 85 mmHg']);
    expect(reasons({ latestVisit: { medicationTaking: 'incorrect', herbalOrPainkiller: true } })).toEqual(['กินยาสมุนไพร/ยาแก้ปวด', 'กินยาไม่ถูกต้อง']);
    expect(reasons({ stage: null, gfrFlags: ['missing'] })).toEqual(['ยังไม่มีผล GFR']);
  });
});

describe('pharmacist urgency color', () => {
  const today = new Date('2026-11-04');
  const visit = { visitDate: new Date('2026-11-01'), nextAppointment: new Date('2026-11-04'), medicationTaking: 'correct', herbalOrPainkiller: false };
  const status = (latestVisit: Parameters<typeof derivePatientStatus>[0]['latestVisit']) =>
    derivePatientStatus({ birthDate: new Date('1950-01-01'), labs: [{ test: 'gfr', value: 12, collectedAt: today }], latestVisit }, DEFAULT_RULES, today);

  it('comes only from the latest visit, whatever the CKD stage', () => {
    expect(status(null).color).toBeNull();
    expect(status(visit).color).toBeNull();
    expect(status({ ...visit, urgencyColor: 'orange' }).color).toBe('orange');
  });

  it('sorts red, orange, yellow, then no color', () => {
    expect([null, 'yellow', 'red', 'orange'].sort((a, b) => urgencyRank(a as never) - urgencyRank(b as never))).toEqual(['red', 'orange', 'yellow', null]);
  });

  it('lists only patients due today who must see the pharmacist, most urgent first', () => {
    const p = (id: string, nextAppointment: string | null, nextSeePharmacist: 'yes' | 'no' | null, color: 'red' | 'yellow' | null) => ({ id, nextAppointment, nextSeePharmacist, color });
    const due = seePharmacistToday(
      [p('a', '2026-11-04T00:00:00.000Z', 'yes', 'yellow'), p('b', '2026-11-04T00:00:00.000Z', 'no', 'red'), p('c', '2026-11-05T00:00:00.000Z', 'yes', 'red'), p('d', '2026-11-04T00:00:00.000Z', 'yes', 'red')],
      today,
    );
    expect(due.map((x) => x.id)).toEqual(['d', 'a']);
  });
});

describe('small display rules', () => {
  it('flags potassium outside 3.5–5.0', () => {
    expect([3.4, 3.5, 5.0, 5.1].map((v) => potassiumOutOfRange(v))).toEqual([true, false, false, true]);
  });

  it('shows a month in the Buddhist era', () => {
    expect(buddhistMonth('2026-11')).toBe('11/2569');
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
