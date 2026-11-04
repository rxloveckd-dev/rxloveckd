import { describe, expect, it } from 'vitest';
import { dateWarning } from '../src/domain/dateCheck';

const today = '2026-11-04';

describe('dateWarning', () => {
  it('stays quiet for an empty field and for today', () => {
    expect(dateWarning('', 'record', today)).toBeNull();
    expect(dateWarning(today, 'record', today)).toBeNull();
  });

  it('warns about a visit in the future, e.g. 2596 typed for 2569', () => {
    expect(dateWarning('2053-11-04', 'record', today)).toContain('อนาคต');
    expect(dateWarning('2026-11-05', 'record', today)).toContain('อนาคต');
  });

  it('allows back-entered visits, up to ten years old', () => {
    expect(dateWarning('2016-11-04', 'record', today)).toBeNull();
    expect(dateWarning('2016-11-03', 'record', today)).toContain('10 ปี');
  });

  it('checks a birth date against a human age, not ten years', () => {
    expect(dateWarning('1950-01-01', 'birth', today)).toBeNull();
    expect(dateWarning('1906-11-03', 'birth', today)).toContain('120 ปี');
    expect(dateWarning('2027-01-01', 'birth', today)).toContain('อนาคต');
  });

  it('expects an appointment ahead, within two years', () => {
    expect(dateWarning('2027-02-01', 'appointment', today)).toBeNull();
    expect(dateWarning('2020-02-01', 'appointment', today)).toBeNull();
    expect(dateWarning('2028-11-05', 'appointment', today)).toContain('2 ปี');
  });
});
