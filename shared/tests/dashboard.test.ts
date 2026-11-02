import { describe, expect, it } from 'vitest';
import { aceiArbCoverage, lastMonths } from '../src/domain/dashboard';

describe('lastMonths', () => {
  it('returns the last n months oldest first, ending with the current month', () => {
    expect(lastMonths(3, new Date('2026-02-15'))).toEqual(['2025-12', '2026-01', '2026-02']);
  });
});

describe('aceiArbCoverage', () => {
  it('counts each patient once by their latest visit', () => {
    const visits = [
      { patientId: 'a', visitDate: new Date('2026-01-01'), visitNo: 1, aceiArb: 'no' },
      { patientId: 'a', visitDate: new Date('2026-03-01'), visitNo: 2, aceiArb: 'yes' },
      { patientId: 'b', visitDate: new Date('2026-02-01'), visitNo: 1, aceiArb: 'no' },
      { patientId: 'c', visitDate: new Date('2026-02-01'), visitNo: 1, aceiArb: null },
    ];
    expect(aceiArbCoverage(visits, ['a', 'b', 'c', 'd'])).toEqual({ yes: 1, no: 1, unknown: 2 });
  });
});
