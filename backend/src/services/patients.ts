import type { LabResult, Patient, Prisma, Visit } from '@prisma/client';
import {
  derivePatientStatus,
  urgencyRank,
  maskNationalId,
  type ClinicalRules,
  type PatientDerived,
  type PatientSummary,
} from '@rx/shared';
import { prisma } from '../db';

export type PatientWithStatusData = Patient & {
  labs: Pick<LabResult, 'test' | 'value' | 'collectedAt'>[];
  visits: Pick<Visit, 'visitDate' | 'nextAppointment' | 'medicationTaking' | 'herbalOrPainkiller' | 'urgencyColor' | 'nextSeePharmacist'>[];
};

/** Labs needed for status, newest first; only the latest visit. */
export const STATUS_INCLUDE = {
  labs: {
    where: { test: { in: ['gfr', 'potassium', 'sbp'] } },
    select: { test: true, value: true, collectedAt: true },
    orderBy: [{ collectedAt: 'desc' }, { createdAt: 'desc' }],
  },
  visits: {
    select: { visitDate: true, nextAppointment: true, medicationTaking: true, herbalOrPainkiller: true, urgencyColor: true, nextSeePharmacist: true },
    orderBy: [{ visitDate: 'desc' }, { visitNo: 'desc' }],
    take: 1,
  },
} satisfies Prisma.PatientInclude;

export function derive(p: PatientWithStatusData, rules: ClinicalRules, today: Date): PatientDerived {
  return derivePatientStatus({ birthDate: p.birthDate, labs: p.labs, latestVisit: p.visits[0] ?? null }, rules, today);
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

/** All patients in the program with derived status, most urgent first. */
export async function listSummaries(rules: ClinicalRules, today: Date, status: 'active' | 'discharged' = 'active') {
  const rows = await prisma.patient.findMany({
    where: { programStatus: status },
    include: STATUS_INCLUDE,
    orderBy: [{ lastName: 'asc' }],
  });
  return rows
    .map((p) => toSummary(p, rules, today))
    .sort((a, b) => urgencyRank(a.color) - urgencyRank(b.color));
}
