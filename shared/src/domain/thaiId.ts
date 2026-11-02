const NON_DIGITS = /[\s-]/g;

export function normalizeNationalId(input: string): string {
  return input.replace(NON_DIGITS, '');
}

/** 13 digits, first digit 1–8, mod-11 check digit (research.md R6). */
export function isValidThaiNationalId(input: string): boolean {
  const id = normalizeNationalId(input);
  if (!/^[1-8]\d{12}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(id[i]) * (13 - i);
  return (11 - (sum % 11)) % 10 === Number(id[12]);
}

/** Shows only the last four digits in the usual 1-4-5-2-1 grouping. */
export function maskNationalId(input: string): string {
  const id = normalizeNationalId(input);
  const masked = 'X'.repeat(Math.max(id.length - 4, 0)) + id.slice(-4);
  return [masked.slice(0, 1), masked.slice(1, 5), masked.slice(5, 10), masked.slice(10, 12), masked.slice(12)]
    .filter(Boolean)
    .join('-');
}
