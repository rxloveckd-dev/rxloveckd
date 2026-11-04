import type { DataFlag } from './dataQuality';
import type { CkdStage, ClinicalRules } from './rules';

/**
 * Follow-up urgency is chosen by the pharmacist on each visit (clinic request 2026-11-04), most
 * urgent first. It is separate from the CKD stage color; no color means nothing to chase up.
 */
export const URGENCY_COLORS = ['red', 'orange', 'yellow'] as const;
export type UrgencyColor = (typeof URGENCY_COLORS)[number];
/** Sort key: most urgent first, patients without a color last. */
export const urgencyRank = (color: UrgencyColor | null) => (color ? URGENCY_COLORS.indexOf(color) : URGENCY_COLORS.length);
export type AppointmentStatus = 'none' | 'scheduled' | 'upcoming' | 'missed';

export interface FollowUpInput {
  stage: CkdStage | null;
  gfrChangePct: number | null;
  gfrFlags: DataFlag[];
  latestPotassium: number | null;
  latestSbp: number | null;
  appointment: AppointmentStatus;
  latestVisit: { medicationTaking: 'correct' | 'incorrect'; herbalOrPainkiller: boolean } | null;
}

/** Things the pharmacist should look at (spec FR-003c), most serious first. Never sets the color. */
export function followUpReasons(input: FollowUpInput, rules: ClinicalRules): string[] {
  const reasons: string[] = [];
  const fall = input.gfrChangePct !== null && input.gfrChangePct < 0 ? -input.gfrChangePct : 0;

  if (input.appointment === 'missed') reasons.push('เลยวันนัด');
  if (input.stage === '5') reasons.push('CKD ระยะ 5');
  if (fall > rules.gfrFallRedPct) reasons.push(`GFR ลดลง ${fall.toFixed(1)}% (มากกว่า ${rules.gfrFallRedPct}%)`);
  if (input.latestPotassium !== null && input.latestPotassium > rules.potassiumRed) {
    reasons.push(`โพแทสเซียมสูง ${input.latestPotassium} mmol/L`);
  }
  if (input.latestSbp !== null && input.latestSbp < rules.sbpLow) reasons.push(`ความดันต่ำ ${input.latestSbp} mmHg`);
  if (input.stage === '4') reasons.push('CKD ระยะ 4');
  if (input.stage === '3a' || input.stage === '3b') reasons.push(`CKD ระยะ ${input.stage}`);
  if (fall >= rules.gfrFallYellowPct && fall <= rules.gfrFallRedPct) reasons.push(`GFR ลดลง ${fall.toFixed(1)}%`);
  if (input.latestVisit?.herbalOrPainkiller) reasons.push('กินยาสมุนไพร/ยาแก้ปวด');
  if (input.latestVisit?.medicationTaking === 'incorrect') reasons.push('กินยาไม่ถูกต้อง');
  if (input.gfrFlags.includes('missing')) reasons.push('ยังไม่มีผล GFR');
  else if (input.gfrFlags.includes('stale')) reasons.push('ผล GFR เก่าเกินกำหนด');
  return reasons;
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
