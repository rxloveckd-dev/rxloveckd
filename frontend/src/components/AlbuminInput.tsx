import { useState } from 'react';
import { ALBUMIN_LEVELS } from '@rx/shared';

const OTHER = 'other';
const isLevel = (v: string) => (ALBUMIN_LEVELS as readonly string[]).includes(v);

/** Albumin: pick a level, or "อื่นๆ" to type any other result. `value` is the level or the typed text. */
export function AlbuminInput({ id, value, emptyLabel = 'เลือก', onChange }: { id: string; value: string; emptyLabel?: string; onChange: (v: string) => void }) {
  const [typing, setTyping] = useState(value !== '' && !isLevel(value));
  return (
    <>
      <select
        id={id}
        value={typing ? OTHER : value}
        onChange={(e) => {
          const other = e.target.value === OTHER;
          setTyping(other);
          onChange(other ? '' : e.target.value);
        }}
      >
        <option value="">{emptyLabel}</option>
        {ALBUMIN_LEVELS.map((a) => <option key={a}>{a}</option>)}
        <option value={OTHER}>อื่นๆ (พิมพ์เอง)</option>
      </select>
      {typing && (
        <input aria-label="ระบุค่า Albumin" placeholder="พิมพ์ค่า Albumin" maxLength={30} value={value} onChange={(e) => onChange(e.target.value)} className="detail-input" />
      )}
    </>
  );
}
