/**
 * Clinical rule values. Every value here is a demo default until the clinical owner approves a
 * rule version (spec FR-026–FR-028); the backend stores approved versions and passes them in.
 */
export type CkdStage = '1' | '2' | '3a' | '3b' | '4' | '5';

export interface ClinicalRules {
  version: number;
  approved: boolean;
  /** Lowest GFR for each stage, ordered from stage 1 down to stage 5 (KDIGO 2012). */
  stageCutoffs: { stage: CkdStage; minGfr: number }[];
  gfrFallYellowPct: number;
  gfrFallRedPct: number;
  potassiumRed: number;
  /** Normal potassium range; results outside it are shown in red. */
  potassiumLow: number;
  potassiumHigh: number;
  sbpLow: number;
  gfrStaleDays: number;
  reminderDays: number;
}

export const DEFAULT_RULES: ClinicalRules = {
  version: 1,
  approved: true, // clinic team confirmed 2026-11-04
  stageCutoffs: [
    { stage: '1', minGfr: 90 },
    { stage: '2', minGfr: 60 },
    { stage: '3a', minGfr: 45 },
    { stage: '3b', minGfr: 30 },
    { stage: '4', minGfr: 15 },
    { stage: '5', minGfr: 0 },
  ],
  gfrFallYellowPct: 10,
  gfrFallRedPct: 25,
  potassiumRed: 5.5,
  potassiumLow: 3.5,
  potassiumHigh: 5.0,
  sbpLow: 90,
  gfrStaleDays: 180,
  reminderDays: 7,
};

export const potassiumOutOfRange = (value: number, rules: ClinicalRules = DEFAULT_RULES) =>
  value < rules.potassiumLow || value > rules.potassiumHigh;
