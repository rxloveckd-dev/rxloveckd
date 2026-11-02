import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LABELS, type DischargeCode, type MonthlySummary, type PatientSummary, type SessionUser } from '@rx/shared';

/** GitHub Pages build: no server, the API is answered in the browser with synthetic data. */
export const STATIC_DEMO = import.meta.env.VITE_STATIC_DEMO === 'true';
/** Static demo that saves into the trial Google Sheet instead of browser storage. */
export const USES_SHEETS = STATIC_DEMO && !!import.meta.env.VITE_SHEETS_API_URL;
/** Private clinic web app served by Google Apps Script; Google account sign-in, no passwords. */
export const GAS_MODE = import.meta.env.VITE_GAS === 'true';
/** API answered in the browser (static demo or Apps Script) rather than by the Express server. */
const BROWSER_API = STATIC_DEMO || GAS_MODE;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public field?: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  if (BROWSER_API) {
    const { mockApi, MockHttpError } = await import('./demo/mockApi');
    try {
      return (await mockApi(path, rest.method ?? 'GET', json)) as T;
    } catch (err) {
      if (err instanceof MockHttpError) throw new ApiError(err.status, err.message, err.field);
      throw err;
    }
  }
  const res = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    ...rest,
    headers: json !== undefined ? { 'Content-Type': 'application/json' } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.error?.message ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่', body?.error?.field);
  }
  return res.json() as Promise<T>;
}

/** Server build: Excel from the API (audited). Static demo: the same figures as a CSV that Excel opens. */
export async function downloadMonthlyReport(month: string) {
  if (!BROWSER_API) {
    window.location.href = `/api/reports/monthly.xlsx?month=${month}`;
    return;
  }
  const s = await api<MonthlySummary>(`/reports/monthly?month=${month}`);
  const rows: [string, string | number][] = [
    ['เดือน', s.month],
    ['จำนวนครั้งที่ผู้ป่วยมาติดตาม', s.visits],
    ['จำนวนผู้ป่วยที่มาติดตาม (คน)', s.patientsSeen],
    ['ผู้ป่วยลงทะเบียนใหม่', s.newEnrollments],
    ['กินยาไม่ถูกต้อง (ครั้ง)', s.incorrectTaking],
    ['กินยาสมุนไพร/ยาแก้ปวด (ครั้ง)', s.herbalOrPainkiller],
    ['ไม่คุมอาหาร (ครั้ง)', s.dietUncontrolled],
    ['เครื่องปรุงควรปรับลด (ครั้ง)', s.seasoningReduceNeeded],
    ['DRP ที่พบ', s.drps],
    ['DRP ที่แพทย์ยอมรับ (รวมยอมรับแบบปรับ)', s.drpsAccepted],
    ...Object.entries(s.drpsByCategory).map(
      ([k, v]) => [`DRP: ${LABELS.drpCategory[k as keyof typeof LABELS.drpCategory] ?? k}`, v] as [string, number],
    ),
    ['จำหน่ายผู้ป่วย (คน)', s.discharges],
    ...Object.entries(s.dischargesByReason).map(
      ([k, v]) => [`จำหน่าย: ${k} ${LABELS.discharge[k as keyof typeof LABELS.discharge] ?? ''}`, v] as [string, number],
    ),
  ];
  const csv = '﻿รายการ,จำนวน\n' + rows.map(([k, v]) => `"${k}",${v}`).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `loveckd-summary-${month}.csv` });
  a.click();
  URL.revokeObjectURL(url);
}

export const useMe = () =>
  useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ user: SessionUser; demoMode: boolean }>('/auth/me'),
    retry: false,
  });

export interface PatientProfile extends PatientSummary {
  birthDate: string;
  enrolledAt: string;
  ckdCause: string | null;
  notes: string | null;
  dischargeCode: DischargeCode | null;
  dischargeDate: string | null;
  dischargeNote: string | null;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const usePatients = (params: Record<string, string>) => {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
  return useQuery({ queryKey: ['patients', qs], queryFn: () => api<Paged<PatientSummary>>(`/patients?${qs}`) });
};

export const usePatient = (id: string) =>
  useQuery({ queryKey: ['patient', id], queryFn: () => api<{ patient: PatientProfile }>(`/patients/${id}`) });

export const usePatientList = <T,>(id: string, kind: 'visits' | 'labs' | 'medications' | 'drps') =>
  useQuery({ queryKey: ['patient', id, kind], queryFn: () => api<{ items: T[] }>(`/patients/${id}/${kind}`) });

/**
 * POST/PATCH helper that refreshes everything about a patient afterwards.
 * `path` may be a function of the body when the target record varies per call.
 */
export function usePatientMutation<TBody, TResult>(
  patientId: string | null,
  path: string | ((body: TBody) => string),
  method: 'POST' | 'PATCH' = 'POST',
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TBody) => api<TResult>(typeof path === 'function' ? path(body) : path, { method, json: body }),
    onSuccess: () => {
      if (patientId) qc.invalidateQueries({ queryKey: ['patient', patientId] });
      qc.invalidateQueries({ queryKey: ['patients'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
