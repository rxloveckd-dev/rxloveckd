import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VisitDetails, type VisitRow } from '../src/components/VisitDetails';

const visit: VisitRow = {
  id: 'v1',
  visitNo: 2,
  visitDate: '2026-11-05',
  medicationTaking: 'correct',
  herbalOrPainkiller: false,
  herbalDetail: null,
  dietControlled: true,
  seasoning: 'adjusted',
  furtherAdjustments: null,
  nextAppointment: null,
  aceiArb: null,
  aceiArbNoReason: null,
  pharmacistName: 'ภก.ทดสอบ',
};

const gfrRow = () => screen.getByText('GFR').nextElementSibling!;

describe('GFR on a visit', () => {
  it('shows the GFR with its change from the previous result, red on a fall of 10% or more', () => {
    render(<VisitDetails visit={visit} gfr={{ value: 42, previous: 48, changePct: -12.5 }} />);
    expect(gfrRow().textContent).toBe('42.0 (-12.5% จากครั้งก่อน 48.0)');
    expect(gfrRow().querySelector('.down')).not.toBeNull();
  });

  it('marks a rise with + and does not color it', () => {
    render(<VisitDetails visit={visit} gfr={{ value: 50, previous: 40, changePct: 25 }} />);
    expect(gfrRow().textContent).toBe('50.0 (+25.0% จากครั้งก่อน 40.0)');
    expect(gfrRow().querySelector('.down')).toBeNull();
  });

  it('says when there is no earlier GFR to compare with', () => {
    render(<VisitDetails visit={visit} gfr={{ value: 42, previous: null, changePct: null }} />);
    expect(gfrRow().textContent).toBe('42.0 (ไม่มีผลครั้งก่อน)');
  });

  it('shows a dash for a visit without a GFR, and no row while labs are not known', () => {
    const { rerender } = render(<VisitDetails visit={visit} gfr={null} />);
    expect(gfrRow().textContent).toBe('–');
    rerender(<VisitDetails visit={visit} />);
    expect(screen.queryByText('GFR')).toBeNull();
  });
});
