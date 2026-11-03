/** Hospital number: always 9 digits at this hospital. */
export const HN_LENGTH = 9;

/**
 * Expands the clinic's shorthand: "/" stands for as many zeros as needed to reach 9 digits,
 * so "45/70" → "450000070". Spaces and dashes are dropped. Anything that cannot be expanded is
 * returned as digits only, for {@link isValidHn} to reject.
 */
export function normalizeHn(raw: string): string {
  const text = raw.replace(/[\s-]/g, '');
  const slash = text.indexOf('/');
  if (slash < 0) return text;
  const left = text.slice(0, slash).replace(/\D/g, '');
  const right = text.slice(slash + 1).replace(/\D/g, '');
  const zeros = HN_LENGTH - left.length - right.length;
  return zeros >= 0 ? left + '0'.repeat(zeros) + right : left + right;
}

export const isValidHn = (hn: string) => new RegExp(`^\\d{${HN_LENGTH}}$`).test(hn);
