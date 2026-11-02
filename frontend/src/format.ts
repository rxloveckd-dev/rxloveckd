const dateFmt = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** Thai Buddhist-era date, e.g. "5 พ.ย. 2569". */
export function thDate(value: string | Date | null | undefined): string {
  if (!value) return '–';
  return dateFmt.format(new Date(value));
}

export function pct(value: number | null | undefined): string {
  if (value === null || value === undefined) return '–';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export function num(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined) return '–';
  return value.toLocaleString('th-TH', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export const todayIso = () => new Date().toISOString().slice(0, 10);
