import type { AppointmentStatus, UrgencyColor } from './domain/urgency';
import type { CkdStage } from './domain/rules';
import type { DataFlag } from './domain/dataQuality';

export type Role = 'pharmacist' | 'supervisor' | 'admin';

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  role: Role;
}

/** Derived, never-stored patient status shared by list, profile and dashboard. */
export interface PatientDerived {
  age: number;
  latestGfr: { value: number; collectedAt: string } | null;
  previousGfr: number | null;
  gfrChangePct: number | null;
  gfrFlags: DataFlag[];
  stage: CkdStage | null;
  color: UrgencyColor;
  reasons: string[];
  nextAppointment: string | null;
  appointment: AppointmentStatus;
}

export interface PatientSummary extends PatientDerived {
  id: string;
  hn: string;
  nationalIdMasked: string;
  title: string;
  firstName: string;
  lastName: string;
  sex: 'male' | 'female';
  programStatus: string;
}
