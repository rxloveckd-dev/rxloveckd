import { describe, expect, it } from 'vitest';
import { isValidThaiNationalId, maskNationalId } from '../src/domain/thaiId';

describe('isValidThaiNationalId', () => {
  it('accepts an ID whose check digit matches', () => {
    expect(isValidThaiNationalId('1101700207030')).toBe(true);
  });

  it('rejects a wrong check digit', () => {
    expect(isValidThaiNationalId('1101700207031')).toBe(false);
  });

  it('rejects wrong length, non-digits and a leading 0 or 9', () => {
    expect(isValidThaiNationalId('110170020703')).toBe(false);
    expect(isValidThaiNationalId('11017002070300')).toBe(false);
    expect(isValidThaiNationalId('110170020703A')).toBe(false);
    expect(isValidThaiNationalId('0101700207030')).toBe(false);
    expect(isValidThaiNationalId('9101700207030')).toBe(false);
  });

  it('ignores dashes and spaces typed by users', () => {
    expect(isValidThaiNationalId('1-1017-00207-03-0')).toBe(true);
    expect(isValidThaiNationalId('1 1017 00207 03 0')).toBe(true);
  });
});

describe('maskNationalId', () => {
  it('shows only the last four digits', () => {
    expect(maskNationalId('1101700207030')).toBe('X-XXXX-XXXX7-03-0');
  });
});
