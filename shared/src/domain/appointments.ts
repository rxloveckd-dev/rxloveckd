import type { PatientSummary } from '../types';
import { urgencyRank } from './urgency';

export type Attendance = 'waiting' | 'came' | 'missed';
type SeePharmacist = 'yes' | 'no' | null;

export interface AppointmentVisit {
  visitNo: number;
  visitDate: string | Date;
  nextAppointment: string | Date | null;
  nextSeePharmacist?: string | null;
}

export interface PatientAppointment {
  date: string;
  attendance: Attendance;
  seePharmacist: SeePharmacist;
}

export interface AppointmentRow extends PatientAppointment, Pick<PatientSummary, 'id' | 'hn' | 'title' | 'firstName' | 'lastName' | 'stage' | 'color'> {}

const dayOf = (value: string | Date) => (typeof value === 'string' ? value : value.toISOString()).slice(0, 10);

/** The date in Thailand; the server clock is UTC, which is still yesterday until 07:00. */
export function thaiToday(now: Date): string {
  return new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * Every appointment a patient was given, read from all their visits, so that someone who came
 * stays on that day instead of moving to their next appointment. The visit after an appointment
 * settles it: on or after the day means they came, before the day means they were rebooked.
 */
export function patientAppointments(visits: AppointmentVisit[], today: string): PatientAppointment[] {
  const ordered = [...visits].sort((a, b) => dayOf(a.visitDate).localeCompare(dayOf(b.visitDate)) || a.visitNo - b.visitNo);
  const byDate = new Map<string, PatientAppointment>();
  ordered.forEach((visit, i) => {
    if (!visit.nextAppointment) return;
    const date = dayOf(visit.nextAppointment);
    const following = ordered[i + 1];
    if (following && dayOf(following.visitDate) < date) return;
    const attendance: Attendance = following ? 'came' : date < today ? 'missed' : 'waiting';
    byDate.set(date, { date, attendance, seePharmacist: (visit.nextSeePharmacist ?? null) as SeePharmacist });
  });
  return [...byDate.values()];
}

const pharmacistRank = (row: AppointmentRow) => (row.seePharmacist === 'yes' ? 0 : 1);
const cameRank = (row: AppointmentRow) => (row.attendance === 'came' ? 1 : 0);

/** A month of appointments by day; within a day, those still to come first, then pharmacist visits, then urgency. */
export function monthAppointments(
  patients: { patient: Pick<AppointmentRow, 'id' | 'hn' | 'title' | 'firstName' | 'lastName' | 'stage' | 'color'>; visits: AppointmentVisit[] }[],
  month: string,
  today: string,
): AppointmentRow[] {
  return patients
    .flatMap(({ patient: p, visits }) =>
      patientAppointments(visits, today)
        .filter((a) => a.date.startsWith(month))
        .map((a) => ({ id: p.id, hn: p.hn, title: p.title, firstName: p.firstName, lastName: p.lastName, stage: p.stage, color: p.color, ...a })),
    )
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        cameRank(a) - cameRank(b) ||
        pharmacistRank(a) - pharmacistRank(b) ||
        urgencyRank(a.color) - urgencyRank(b.color),
    );
}
