import { useState, type KeyboardEvent } from 'react';

const MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const BE = 543;
/** Matches `.date-pop` in styles.css. */
export const CALENDAR_WIDTH = 296;
const YEARS_BACK = 120; // birth dates
const YEARS_AHEAD = 5; // appointments

const toIso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** Month grid in พ.ศ., because the browser's own date picker follows its language and shows ค.ศ. */
export function ThaiCalendar({ value, min, today, fromLeft, onPick }: { value: string; min?: string; today: string; fromLeft: boolean; onPick: (iso: string) => void }) {
  const lastYear = Number(today.slice(0, 4)) + YEARS_AHEAD;
  const firstYear = lastYear - YEARS_AHEAD - YEARS_BACK;
  const start = value || today;
  const [view, setView] = useState({
    year: Math.min(lastYear, Math.max(firstYear, Number(start.slice(0, 4)))),
    month: Number(start.slice(5, 7)) - 1,
  });
  const { year, month } = view;
  const leadingBlanks = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => lastYear - i);

  const step = (by: number) => {
    const next = new Date(Date.UTC(year, month + by, 1));
    setView({ year: next.getUTCFullYear(), month: next.getUTCMonth() });
  };
  // Enter on the month and year lists must not reach the form's move-to-next-field handler.
  const keepEnterHere = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' || e.target instanceof HTMLButtonElement) return;
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className={fromLeft ? 'date-pop from-left' : 'date-pop'} role="dialog" aria-label="ปฏิทิน พ.ศ." onKeyDown={keepEnterHere}>
      <div className="date-pop-head">
        <button type="button" aria-label="เดือนก่อน" disabled={year === firstYear && month === 0} onClick={() => step(-1)}>◀</button>
        <select aria-label="เดือน" value={month} onChange={(e) => setView({ year, month: Number(e.target.value) })}>
          {MONTHS.map((name, i) => <option key={name} value={i}>{name}</option>)}
        </select>
        <select aria-label="ปี พ.ศ." value={year} onChange={(e) => setView({ year: Number(e.target.value), month })}>
          {years.map((y) => <option key={y} value={y}>{y + BE}</option>)}
        </select>
        <button type="button" aria-label="เดือนถัดไป" disabled={year === lastYear && month === 11} onClick={() => step(1)}>▶</button>
      </div>
      <div className="date-pop-grid">
        {WEEKDAYS.map((d) => <span key={d} className="date-pop-weekday">{d}</span>)}
        {Array.from({ length: leadingBlanks }, (_, i) => <span key={`blank-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const iso = toIso(year, month, i + 1);
          const classes = [iso === value && 'picked', iso === today && 'today'].filter(Boolean).join(' ');
          return (
            <button
              key={iso}
              type="button"
              className={classes || undefined}
              aria-label={`${i + 1} ${MONTHS[month]} ${year + BE}`}
              aria-pressed={iso === value}
              disabled={!!min && iso < min}
              onClick={() => onPick(iso)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <button type="button" className="date-pop-today" disabled={!!min && today < min} onClick={() => onPick(today)}>วันนี้</button>
    </div>
  );
}
