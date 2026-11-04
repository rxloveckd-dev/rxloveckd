import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

/** ISO "2026-11-03" → "03/11/2569" (day/month/Buddhist-era year). */
function isoToText(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${Number(m[1]) + 543}` : '';
}

/** "03/11/2569", "3/11/2569" or "03/11/2026" → ISO, or '' when incomplete / not a real date. */
function textToIso(text: string): string {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (!m) return '';
  const d = Number(m[1]);
  const mo = Number(m[2]);
  let y = Number(m[3]);
  if (y > 2400) y -= 543; // Buddhist era
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return '';
  return dt.toISOString().slice(0, 10);
}

/**
 * Tidies the field after a keystroke, so staff type digits only ("01122569" → "01/12/2569") and can
 * fix one digit of a finished date: a digit typed into a full date replaces the one after the
 * cursor, and a digit deleted from the day or month leaves the other parts where they are.
 */
function retype(raw: string, caret: number): { text: string; caret: number } {
  const parts = raw.split('/');
  const inPlace = parts.length === 3 && parts.every((p, i) => /^\d*$/.test(p) && p.length <= (i === 2 ? 4 : 2));
  if (inPlace) return { text: raw, caret };

  const before = raw.slice(0, caret).replace(/\D/g, '').length;
  const all = raw.replace(/\D/g, '');
  const digits = all.slice(0, before) + all.slice(before + Math.max(0, all.length - 8));
  const text = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join('/');
  const kept = Math.min(before, digits.length);
  return { text, caret: kept + (kept > 4 ? 2 : kept > 2 ? 1 : 0) };
}

/**
 * Date field typed as วว/ดด/ปปปป (พ.ศ. or ค.ศ.), digits only, or picked from the calendar button.
 * `value`/`onChange` use ISO yyyy-mm-dd.
 */
export function DateInput({ id, value, min, onChange }: { id?: string; value: string; min?: string; onChange: (iso: string) => void }) {
  const [text, setText] = useState(() => isoToText(value));
  const [caret, setCaret] = useState<{ at: number } | null>(null);
  const field = useRef<HTMLInputElement>(null);

  // Rewriting the text sends the cursor to the end; put it back where the staff member was.
  useLayoutEffect(() => {
    if (caret) field.current?.setSelectionRange(caret.at, caret.at);
  }, [caret]);

  // Follow outside changes (calendar pick, form reset) without fighting the user's typing.
  useEffect(() => {
    if (value !== textToIso(text)) setText(isoToText(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="date-input">
      <input
        ref={field}
        id={id}
        inputMode="numeric"
        placeholder="วว/ดด/ปปปป เช่น 01122569"
        maxLength={11}
        value={text}
        onChange={(e) => {
          const next = retype(e.target.value, e.target.selectionStart ?? e.target.value.length);
          setText(next.text);
          setCaret({ at: next.caret });
          onChange(textToIso(next.text));
        }}
        onBlur={() => {
          if (value) setText(isoToText(value));
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
          min={min}
          onChange={(e) => {
            setText(isoToText(e.target.value));
            onChange(e.target.value);
          }}
        />
      </span>
    </div>
  );
}
