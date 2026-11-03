import type { ReactNode } from 'react';
import { LABELS, type UrgencyColor } from '@rx/shared';
import { ApiError } from '../api';

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="section">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3 className="tab">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Urgency({ color }: { color: UrgencyColor }) {
  return <span className={`badge ${color}`}>{LABELS.urgency[color]}</span>;
}

/** Stage badge colored like the clinic's scheme: 1–2 green, 3a–3b yellow, 4 pink, 5 red. */
export function Stage({ stage }: { stage: string | null }) {
  if (!stage) return <span className="muted">–</span>;
  return (
    <span className={`stage s${stage.charAt(0)}`} title={`ระยะโรคไต ${stage}`}>
      {stage}
    </span>
  );
}

export function Field({
  label,
  error,
  children,
  htmlFor,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error && <span className="err">{error}</span>}
    </div>
  );
}

/** Pill-style radio group used for the paper-form yes/no items. */
export function Choice<T extends string>({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: T | '';
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div className="choice" role="radiogroup">
      {options.map(([v, label]) => (
        <label key={v}>
          <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} />
          {label}
        </label>
      ))}
    </div>
  );
}

export function Loading() {
  return <div className="state" role="status">กำลังโหลด…</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="state">{children}</div>;
}

export function ErrorState({ error }: { error: unknown }) {
  const message = error instanceof ApiError ? error.message : 'โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่';
  return <div className="alert" role="alert">{message}</div>;
}

/** แก้ไข / ลบ buttons for one record; delete always asks first. */
export function RowActions({
  onEdit,
  onDelete,
  confirmText,
  busy,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  confirmText: string;
  busy?: boolean;
}) {
  return (
    <span className="row-actions">
      {onEdit && (
        <button type="button" className="btn secondary small" onClick={onEdit} disabled={busy}>แก้ไข</button>
      )}
      {onDelete && (
        <button
          type="button"
          className="btn secondary small danger"
          disabled={busy}
          onClick={() => {
            if (window.confirm(confirmText)) onDelete();
          }}
        >
          ลบ
        </button>
      )}
    </span>
  );
}
