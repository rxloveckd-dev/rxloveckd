import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PatientSummary, SessionUser } from '@rx/shared';

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
