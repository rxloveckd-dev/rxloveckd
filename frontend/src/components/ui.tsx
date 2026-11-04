import type { ReactNode } from 'react';
import { LABELS, URGENCY_COLORS, type UrgencyColor } from '@rx/shared';
import { ApiError } from '../api';
import { Icon } from './Icon';

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

export function Urgency({ color }: { color: UrgencyColor | null }) {
  if (!color) return <span className="muted">–</span>;
  return <span className={`badge ${color}`}>{LABELS.urgency[color]}</span>;
}

/** สีความเร่งด่วน: the pharmacist's choice; "ไม่มีสี" clears it once the patient has improved. */
export function UrgencyPicker({ name, value, onChange }: { name: string; value: UrgencyColor | ''; onChange: (v: UrgencyColor | '') => void }) {
  const options = [...URGENCY_COLORS, ''] as const;
  return (
    <div className="choice" role="radiogroup" aria-label="สีความเร่งด่วน">
      {options.map((c) => (
        <label key={c || 'none'} className={c ? `tone-${c}` : undefined}>
          <input type="radio" name={name} value={c} checked={value === c} onChange={() => onChange(c)} />
          {c ? LABELS.urgency[c] : 'ไม่มีสี'}
        </label>
      ))}
    </div>
  );
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
  danger = [],
}: {
  name: string;
  value: T | '';
  options: [T, string][];
  onChange: (v: T) => void;
  /** Answers that are a problem for the patient; shown in red when picked. */
  danger?: T[];
}) {
  return (
    <div className="choice" role="radiogroup">
      {options.map(([v, label]) => (
        <label key={v} className={danger.includes(v) ? 'danger' : undefined}>
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
        <button type="button" className="btn secondary small" onClick={onEdit} disabled={busy}><Icon name="edit" />แก้ไข</button>
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
          <Icon name="trash" />ลบ
        </button>
      )}
    </span>
  );
}
