import { useEffect, useState } from 'react';
import { Icon } from './Icon';

/** ISO "2026-11-03" → "03/11/2569" (day/month/Buddhist-era year). */
function isoToText(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${Number(m[1]) + 543}` : '';
}

/** "03/11/2569" or "03/11/2026" → ISO, or '' when incomplete / not a real date. */
function textToIso(text: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!m) return '';
  const d = Number(m[1]);
  const mo = Number(m[2]);
  let y = Number(m[3]);
  if (y > 2400) y -= 543; // Buddhist era
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return '';
  return dt.toISOString().slice(0, 10);
}

/** Inserts the slashes while typing, so staff type digits only: "01122569" → "01/12/2569". */
function mask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/');
}

/**
 * Date field typed as วว/ดด/ปปปป (พ.ศ. or ค.ศ.), digits only, or picked from the calendar button.
 * `value`/`onChange` use ISO yyyy-mm-dd.
 */
export function DateInput({ id, value, onChange }: { id?: string; value: string; onChange: (iso: string) => void }) {
  const [text, setText] = useState(() => isoToText(value));

  // Follow outside changes (calendar pick, form reset) without fighting the user's typing.
  useEffect(() => {
    if (value !== textToIso(text)) setText(isoToText(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="date-input">
      <input
        id={id}
        inputMode="numeric"
        placeholder="วว/ดด/ปปปป เช่น 01122569"
        maxLength={10}
        value={text}
        onChange={(e) => {
          const next = mask(e.target.value);
          setText(next);
          onChange(textToIso(next));
        }}
      />
      {/* The native date input sits invisibly over the icon, so a click opens the browser's
          calendar directly (works inside the Apps Script frame, where showPicker() is blocked). */}
      <span className="date-pick" title="เลือกจากปฏิทิน">
        <Icon name="calendar" />
        <input
          type="date"
          tabIndex={-1}
          aria-label="เลือกจากปฏิทิน"
          value={value}
          onChange={(e) => {
            setText(isoToText(e.target.value));
            onChange(e.target.value);
          }}
        />
      </span>
    </div>
  );
}
