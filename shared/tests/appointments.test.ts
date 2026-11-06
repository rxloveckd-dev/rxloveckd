import { describe, expect, it } from 'vitest';
import { monthAppointments, patientAppointments, thaiToday } from '../src/domain/appointments';

const visit = (visitNo: number, visitDate: string, nextAppointment: string | null, nextSeePharmacist: 'yes' | 'no' | null = null) => ({
  visitNo,
  visitDate,
  nextAppointment,
  nextSeePharmacist,
});

describe('patientAppointments', () => {
  const today = '2026-11-06';

  it('is waiting until the day has passed, then missed', () => {
    expect(patientAppointments([visit(1, '2026-09-01', '2026-11-06')], today)).toEqual([{ date: '2026-11-06', attendance: 'waiting', seePharmacist: null }]);
    expect(patientAppointments([visit(1, '2026-09-01', '2026-11-20')], today)[0]?.attendance).toBe('waiting');
    expect(patientAppointments([visit(1, '2026-09-01', '2026-11-05')], today)[0]?.attendance).toBe('missed');
  });

  it('keeps a patient on the day they came, once the visit is recorded', () => {
    const rows = patientAppointments([visit(1, '2026-09-01', '2026-11-06', 'yes'), visit(2, '2026-11-06', '2027-02-11', 'no')], today);
    expect(rows).toEqual([
      { date: '2026-11-06', attendance: 'came', seePharmacist: 'yes' },
      { date: '2027-02-11', attendance: 'waiting', seePharmacist: 'no' },
    ]);
  });

  it('counts a late visit as came', () => {
    const rows = patientAppointments([visit(1, '2026-09-01', '2026-11-02'), visit(2, '2026-11-04', null)], today);
    expect(rows).toEqual([{ date: '2026-11-02', attendance: 'came', seePharmacist: null }]);
  });

  it('drops the old appointment when the patient came early and was rebooked', () => {
    const rows = patientAppointments([visit(1, '2026-09-01', '2026-11-20'), visit(2, '2026-11-04', '2026-12-18')], today);
    expect(rows.map((r) => r.date)).toEqual(['2026-12-18']);
  });

  it('orders visits by date and number, whatever order they arrive in', () => {
    const rows = patientAppointments([visit(2, '2026-11-06', '2027-02-11'), visit(1, '2026-09-01', '2026-11-06')], today);
    expect(rows.map((r) => r.attendance)).toEqual(['came', 'waiting']);
  });

  it('accepts Date values and full timestamps', () => {
    const rows = patientAppointments(
      [{ visitNo: 1, visitDate: new Date('2026-09-01T00:00:00Z'), nextAppointment: new Date('2026-11-06T00:00:00Z'), nextSeePharmacist: null }],
      today,
    );
    expect(rows[0]?.date).toBe('2026-11-06');
  });
});

describe('monthAppointments', () => {
  const person = (id: string, color: 'red' | 'orange' | 'yellow' | null = null) => ({
    id,
    hn: id,
    title: 'นาย',
    firstName: id,
    lastName: 'ทดสอบ',
    stage: '3a' as const,
    color,
  });

  it('keeps only the month asked for', () => {
    const rows = monthAppointments(
      [{ patient: person('a'), visits: [visit(1, '2026-09-01', '2026-11-30'), visit(2, '2026-11-30', '2026-12-01')] }],
      '2026-11',
      '2026-11-06',
    );
    expect(rows.map((r) => r.date)).toEqual(['2026-11-30']);
  });

  it('lists each day with those still to come first, then pharmacist visits, then urgency', () => {
    const day = '2026-11-09';
    const rows = monthAppointments(
      [
        { patient: person('came', 'red'), visits: [visit(1, '2026-09-01', day, 'yes'), visit(2, day, null)] },
        { patient: person('plain'), visits: [visit(1, '2026-09-01', day, 'no')] },
        { patient: person('yellow', 'yellow'), visits: [visit(1, '2026-09-01', day, 'yes')] },
        { patient: person('red', 'red'), visits: [visit(1, '2026-09-01', day, 'yes')] },
        { patient: person('earlier'), visits: [visit(1, '2026-09-01', '2026-11-02')] },
      ],
      '2026-11',
      day,
    );
    expect(rows.map((r) => r.id)).toEqual(['earlier', 'red', 'yellow', 'plain', 'came']);
  });
});

describe('thaiToday', () => {
  it('turns over at midnight in Thailand, not at 07:00', () => {
    expect(thaiToday(new Date('2026-11-05T16:59:00Z'))).toBe('2026-11-05');
    expect(thaiToday(new Date('2026-11-05T17:00:00Z'))).toBe('2026-11-06');
  });
});
