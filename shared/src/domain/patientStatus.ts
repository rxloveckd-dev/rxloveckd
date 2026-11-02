import { labFlags, type LabTest } from './dataQuality';
import { ckdStage, gfrChangePercent } from './gfr';
import type { ClinicalRules } from './rules';
import { appointmentStatus, urgency } from './urgency';
import type { PatientDerived } from '../types';

export interface StatusLab {
  test: string;
  value: number;
  collectedAt: Date;
}

export interface StatusVisit {
  visitDate: Date;
  nextAppointment: Date | null;
  medicationTaking: string;
  herbalOrPainkiller: boolean;
}

export function ageOn(birthDate: Date, today: Date): number {
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const beforeBirthday =
    today.getUTCMonth() < birthDate.getUTCMonth() ||
    (today.getUTCMonth() === birthDate.getUTCMonth() && today.getUTCDate() < birthDate.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

const newestFirst = <T extends { collectedAt: Date }>(xs: T[]) =>
  [...xs].sort((a, b) => b.collectedAt.getTime() - a.collectedAt.getTime());

/** Derived, never-stored status of one patient: stage, GFR change, color + reasons, appointment. */
export function derivePatientStatus(
  input: { birthDate: Date; labs: StatusLab[]; latestVisit: StatusVisit | null },
  rules: ClinicalRules,
  today: Date,
): PatientDerived {
  const labs = newestFirst(input.labs);
  const gfrs = labs.filter((l) => l.test === 'gfr');
  const latest = gfrs[0] ?? null;
  const previous = gfrs[1]?.value ?? null;
  const gfrFlags = labFlags('gfr', latest, today, rules);
  const usableGfr = latest && !gfrFlags.includes('implausible') ? latest.value : null;
  const stage = ckdStage(usableGfr, rules);
  const change = usableGfr === null ? null : gfrChangePercent(usableGfr, previous);
  const visit = input.latestVisit;
  const next = visit?.nextAppointment ?? null;
  const appointment = appointmentStatus(next, today, rules);
  const latestOf = (test: string) => labs.find((l) => l.test === test)?.value ?? null;

  const result = urgency(
    {
      stage,
      gfrChangePct: change,
      gfrFlags,
      latestPotassium: latestOf('potassium'),
      latestSbp: latestOf('sbp'),
      appointment,
      latestVisit: visit
        ? {
            medicationTaking: visit.medicationTaking as 'correct' | 'incorrect',
            herbalOrPainkiller: visit.herbalOrPainkiller,
          }
        : null,
    },
    rules,
  );

  return {
    age: ageOn(input.birthDate, today),
    latestGfr: latest ? { value: latest.value, collectedAt: latest.collectedAt.toISOString() } : null,
    previousGfr: previous,
    gfrChangePct: change,
    gfrFlags,
    stage,
    color: result.color,
    reasons: result.reasons,
    nextAppointment: next ? next.toISOString() : null,
    appointment,
  };
}

/** Lab history, newest first, with the previous value of the same test and unit and the GFR change. */
export function labHistory<T extends StatusLab & { unit: string }>(labs: T[], rules: ClinicalRules, today: Date) {
  const prevByTestUnit = new Map<string, number>();
  return [...labs]
    .sort((a, b) => a.collectedAt.getTime() - b.collectedAt.getTime())
    .map((l) => {
      const key = `${l.test}|${l.unit}`;
      const previous = prevByTestUnit.get(key) ?? null;
      prevByTestUnit.set(key, l.value);
      return {
        ...l,
        previous,
        changePct: l.test === 'gfr' ? gfrChangePercent(l.value, previous) : null,
        flags: labFlags(l.test as LabTest, l, today, rules).filter((f) => f === 'implausible'),
      };
    })
    .reverse();
}
