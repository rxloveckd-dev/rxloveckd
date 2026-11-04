/** What a date field holds: `record` is something that already happened (visit, lab, enrolment). */
export type DateKind = 'record' | 'birth' | 'appointment';

const OLDEST_RECORD_YEARS = 10;
const OLDEST_AGE_YEARS = 120;
const FURTHEST_APPOINTMENT_YEARS = 2;

const yearsFrom = (iso: string, years: number) => `${Number(iso.slice(0, 4)) + years}${iso.slice(4)}`;

/**
 * A warning for a date that is valid but probably mistyped, usually the พ.ศ. year, or null.
 * It never blocks saving: a real date can still look odd. Dates are ISO yyyy-mm-dd.
 */
export function dateWarning(iso: string, kind: DateKind, today: string): string | null {
  if (!iso) return null;
  if (kind === 'appointment') {
    return iso > yearsFrom(today, FURTHEST_APPOINTMENT_YEARS)
      ? `วันนัดห่างจากวันนี้เกิน ${FURTHEST_APPOINTMENT_YEARS} ปี กรุณาตรวจสอบปี พ.ศ.`
      : null;
  }
  if (iso > today) return 'วันที่นี้อยู่ในอนาคต กรุณาตรวจสอบ';
  if (kind === 'birth') {
    return iso < yearsFrom(today, -OLDEST_AGE_YEARS) ? `อายุเกิน ${OLDEST_AGE_YEARS} ปี กรุณาตรวจสอบปี พ.ศ.` : null;
  }
  return iso < yearsFrom(today, -OLDEST_RECORD_YEARS) ? `วันที่นี้เก่ากว่า ${OLDEST_RECORD_YEARS} ปี กรุณาตรวจสอบปี พ.ศ.` : null;
}
