import type { LabResult, Patient, Prisma, Visit } from '@prisma/client';
import {
  appointmentStatus,
  ckdStage,
  gfrChangePercent,
  labFlags,
  maskNationalId,
  urgency,
  type ClinicalRules,
  type PatientDerived,
  type PatientSummary,
} from '@rx/shared';
import { prisma } from '../db';

export type PatientWithStatusData = Patient & {
  labs: Pick<LabResult, 'test' | 'value' | 'collectedAt'>[];
  visits: Pick<Visit, 'visitDate' | 'nextAppointment' | 'medicationTaking' | 'herbalOrPainkiller'>[];
};

/** Labs needed for status, newest first; visits newest first. */
export const STATUS_INCLUDE = {
  labs: {
    where: { test: { in: ['gfr', 'potassium', 'sbp'] } },
    select: { test: true, value: true, collectedAt: true },
    orderBy: [{ collectedAt: 'desc' }, { createdAt: 'desc' }],
  },
  visits: {
    select: { visitDate: true, nextAppointment: true, medicationTaking: true, herbalOrPainkiller: true },
    orderBy: [{ visitDate: 'desc' }, { visitNo: 'desc' }],
    take: 1,
  },
} satisfies Prisma.PatientInclude;

export function ageOn(birthDate: Date, today: Date): number {
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const beforeBirthday =
    today.getUTCMonth() < birthDate.getUTCMonth() ||
    (today.getUTCMonth() === birthDate.getUTCMonth() && today.getUTCDate() < birthDate.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function derive(p: PatientWithStatusData, rules: ClinicalRules, today: Date): PatientDerived {
  const gfrs = p.labs.filter((l) => l.test === 'gfr');
  const latest = gfrs[0] ?? null;
  const previous = gfrs[1]?.value ?? null;
  const gfrFlags = labFlags('gfr', latest, today, rules);
  const usableGfr = latest && !gfrFlags.includes('implausible') ? latest.value : null;
  const stage = ckdStage(usableGfr, rules);
  const change = usableGfr === null ? null : gfrChangePercent(usableGfr, previous);
  const lastVisit = p.visits[0] ?? null;
  const next = lastVisit?.nextAppointment ?? null;
  const appointment = appointmentStatus(next, today, rules);
  const latestOf = (test: string) => p.labs.find((l) => l.test === test)?.value ?? null;

  const result = urgency(
    {
      stage,
      gfrChangePct: change,
      gfrFlags,
      latestPotassium: latestOf('potassium'),
      latestSbp: latestOf('sbp'),
      appointment,
      latestVisit: lastVisit
        ? {
            medicationTaking: lastVisit.medicationTaking as 'correct' | 'incorrect',
            herbalOrPainkiller: lastVisit.herbalOrPainkiller,
          }
        : null,
    },
    rules,
  );

  return {
    age: ageOn(p.birthDate, today),
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

export function toSummary(p: PatientWithStatusData, rules: ClinicalRules, today: Date): PatientSummary {
  return {
    id: p.id,
    hn: p.hn,
    nationalIdMasked: maskNationalId(p.nationalId),
    title: p.title,
    firstName: p.firstName,
    lastName: p.lastName,
    sex: p.sex as 'male' | 'female',
    programStatus: p.programStatus,
    ...derive(p, rules, today),
  };
}

const COLOR_ORDER = { red: 0, yellow: 1, green: 2 } as const;

/** All patients in the program with derived status, most urgent first. */
export async function listSummaries(rules: ClinicalRules, today: Date, includeInactive = false) {
  const rows = await prisma.patient.findMany({
    where: includeInactive ? {} : { programStatus: 'active' },
    include: STATUS_INCLUDE,
    orderBy: [{ lastName: 'asc' }],
  });
  return rows
    .map((p) => toSummary(p, rules, today))
    .sort((a, b) => COLOR_ORDER[a.color] - COLOR_ORDER[b.color]);
}
