import { describe, expect, it } from 'vitest';
import { HN_LENGTH, isValidHn, normalizeHn } from '../src/domain/hn';

describe('normalizeHn', () => {
  it('fills the "/" with zeros up to 9 digits', () => {
    expect(normalizeHn('45/70')).toBe('450000070');
    expect(normalizeHn('1/2')).toBe('100000002');
    expect(normalizeHn('/123')).toBe('000000123');
    expect(normalizeHn('4500/')).toBe('450000000');
  });

  it('keeps a full 9-digit HN and drops spaces and dashes', () => {
    expect(normalizeHn('450000070')).toBe('450000070');
    expect(normalizeHn(' 45-000-0070 ')).toBe('450000070');
  });

  it('leaves input it cannot expand for validation to reject', () => {
    expect(normalizeHn('12345/678901')).toBe('12345678901');
    expect(normalizeHn('4500070')).toBe('4500070');
  });
});

describe('isValidHn', () => {
  it(`accepts exactly ${HN_LENGTH} digits only`, () => {
    expect(isValidHn('450000070')).toBe(true);
    expect(isValidHn('4500070')).toBe(false);
    expect(isValidHn('45000007a')).toBe(false);
  });
});
