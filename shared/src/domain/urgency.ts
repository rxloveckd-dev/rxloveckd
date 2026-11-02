import type { DataFlag } from './dataQuality';
import type { CkdStage, ClinicalRules } from './rules';

/** Most urgent first: red > orange > yellow > green. Orange marks CKD stage 4 (clinic request). */
export type UrgencyColor = 'green' | 'yellow' | 'orange' | 'red';
export const URGENCY_ORDER: Record<UrgencyColor, number> = { red: 0, orange: 1, yellow: 2, green: 3 };
export type AppointmentStatus = 'none' | 'scheduled' | 'upcoming' | 'missed';

export interface UrgencyInput {
  stage: CkdStage | null;
  gfrChangePct: number | null;
  gfrFlags: DataFlag[];
  latestPotassium: number | null;
  latestSbp: number | null;
  appointment: AppointmentStatus;
  latestVisit: { medicationTaking: 'correct' | 'incorrect'; herbalOrPainkiller: boolean } | null;
}

export interface UrgencyResult {
  color: UrgencyColor;
  reasons: string[];
}

/** Worst of disease risk and follow-up urgency (spec FR-003c); reasons listed most urgent first. */
export function urgency(input: UrgencyInput, rules: ClinicalRules): UrgencyResult {
  const red: string[] = [];
  const orange: string[] = [];
  const yellow: string[] = [];
  const fall = input.gfrChangePct !== null && input.gfrChangePct < 0 ? -input.gfrChangePct : 0;

  if (input.appointment === 'missed') red.push('เลยวันนัด');
  if (input.stage === '5') red.push('CKD ระยะ 5');
  if (input.stage === '4') orange.push('CKD ระยะ 4');
  if (fall > rules.gfrFallRedPct) red.push(`GFR ลดลง ${fall.toFixed(1)}% (มากกว่า ${rules.gfrFallRedPct}%)`);
  if (input.latestPotassium !== null && input.latestPotassium > rules.potassiumRed) {
    red.push(`โพแทสเซียมสูง ${input.latestPotassium} mmol/L`);
  }
  if (input.latestSbp !== null && input.latestSbp < rules.sbpLow) red.push(`ความดันต่ำ ${input.latestSbp} mmHg`);

  if (input.stage === '3a' || input.stage === '3b') yellow.push(`CKD ระยะ ${input.stage}`);
  if (fall >= rules.gfrFallYellowPct && fall <= rules.gfrFallRedPct) yellow.push(`GFR ลดลง ${fall.toFixed(1)}%`);
  if (input.latestVisit?.herbalOrPainkiller) yellow.push('กินยาสมุนไพร/ยาแก้ปวด');
  if (input.latestVisit?.medicationTaking === 'incorrect') yellow.push('กินยาไม่ถูกต้อง');
  if (input.gfrFlags.includes('missing')) yellow.push('ยังไม่มีผล GFR');
  else if (input.gfrFlags.includes('stale')) yellow.push('ผล GFR เก่าเกินกำหนด');

  const color: UrgencyColor = red.length ? 'red' : orange.length ? 'orange' : yellow.length ? 'yellow' : 'green';
  return { color, reasons: [...red, ...orange, ...yellow] };
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function appointmentStatus(next: Date | null, today: Date, rules: ClinicalRules): AppointmentStatus {
  if (!next) return 'none';
  const days = (startOfDay(next) - startOfDay(today)) / DAY_MS;
  if (days < 0) return 'missed';
  if (days <= rules.reminderDays) return 'upcoming';
  return 'scheduled';
}
