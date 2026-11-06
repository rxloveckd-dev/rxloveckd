import { Link, useSearchParams } from 'react-router-dom';
import { LABELS, type AppointmentRow } from '@rx/shared';
import { useAppointments } from '../api';
import { Icon } from '../components/Icon';
import { Empty, ErrorState, Loading, Stage, Urgency } from '../components/ui';
import { todayIso } from '../format';

const monthFmt = new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const dayFmt = new Intl.DateTimeFormat('th-TH', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

const shiftMonth = (month: string, by: number) => {
  const [year = 0, mon = 1] = month.split('-').map(Number);
  return new Date(Date.UTC(year, mon - 1 + by, 1)).toISOString().slice(0, 7);
};

function monthDays(month: string) {
  const [year = 0, mon = 1] = month.split('-').map(Number);
  const count = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  return {
    leadingBlanks: new Date(Date.UTC(year, mon - 1, 1)).getUTCDay(),
    days: Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`),
  };
}

function Calendar({ month, picked, today, items, onPick }: { month: string; picked: string | null; today: string; items: AppointmentRow[]; onPick: (day: string) => void }) {
  const { leadingBlanks, days } = monthDays(month);
  const countOn = (day: string) => items.filter((a) => a.date === day).length;
  return (
    <div className="appt-calendar">
      {WEEKDAYS.map((w) => <div key={w} className="appt-weekday">{w}</div>)}
      {Array.from({ length: leadingBlanks }, (_, i) => <div key={`blank-${i}`} />)}
      {days.map((day) => {
        const count = countOn(day);
        const dayNo = Number(day.slice(8));
        return (
          <button
            key={day}
            type="button"
            className={`appt-day${day === today ? ' today' : ''}`}
            aria-pressed={day === picked}
            aria-label={`วันที่ ${dayNo} นัด ${count} คน`}
            onClick={() => onPick(day)}
          >
            <span>{dayNo}</span>
            {count > 0 && <b>{count}</b>}
          </button>
        );
      })}
    </div>
  );
}

function DayList({ day, rows }: { day: string; rows: AppointmentRow[] }) {
  const seePharmacist = rows.filter((a) => a.seePharmacist === 'yes').length;
  const came = rows.filter((a) => a.attendance === 'came').length;
  return (
    <section className="section">
      <h3 className="tab">{dayFmt.format(new Date(day))}: นัด {rows.length} คน</h3>
      {rows.length === 0 ? (
        <Empty>ไม่มีนัดในวันนี้</Empty>
      ) : (
        <>
          <p className="muted" style={{ margin: '0 0 6px' }}>ต้องพบเภสัชกร {seePharmacist} คน, มาแล้ว {came} คน</p>
          <ul className="list-plain">
            {rows.map((a) => (
              <li key={a.id} className="appt-row">
                <span className="row" style={{ gap: 8 }}>
                  <Link to={`/patients/${a.id}`}>{a.title}{a.firstName} {a.lastName}</Link>
                  <span className="muted">HN {a.hn}</span>
                  <Stage stage={a.stage} />
                  {a.color && <Urgency color={a.color} />}
                </span>
                <span className="row" style={{ gap: 8 }}>
                  {a.seePharmacist && <span className={a.seePharmacist === 'yes' ? 'appt-pharmacist' : 'muted'}>{LABELS.nextSeePharmacist[a.seePharmacist]}</span>}
                  <span className={`appt-attendance ${a.attendance}`}>{LABELS.attendance[a.attendance]}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/** How many patients come on each day and who they are, so the clinic can prepare ahead. */
export function Appointments() {
  const [params, setParams] = useSearchParams();
  const today = todayIso();
  const thisMonth = today.slice(0, 7);
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.get('month') ?? '') ? params.get('month')! : thisMonth;
  const picked = params.get('day')?.startsWith(month) ? params.get('day')! : month === thisMonth ? today : null;
  const { data, isLoading, error } = useAppointments(month);
  const items = data?.items ?? [];

  // Kept in the address so that coming back from a patient returns to the same day.
  const goToMonth = (next: string) => setParams({ month: next }, { replace: true });
  const pickDay = (day: string) => setParams({ month, day }, { replace: true });

  return (
    <>
      <div className="page-head">
        <h1>นัดหมาย</h1>
      </div>
      <section className="section">
        <div className="appt-month">
          <button type="button" className="btn secondary small" onClick={() => goToMonth(shiftMonth(month, -1))}>เดือนก่อน</button>
          <h3><Icon name="calendar" /> {monthFmt.format(new Date(`${month}-01`))}</h3>
          <button type="button" className="btn secondary small" onClick={() => goToMonth(shiftMonth(month, 1))}>เดือนถัดไป</button>
        </div>
        {isLoading && <Loading />}
        {error && <ErrorState error={error} />}
        {data && <Calendar month={month} picked={picked} today={today} items={items} onPick={pickDay} />}
      </section>
      {data && picked && <DayList day={picked} rows={items.filter((a) => a.date === picked)} />}
      {data && !picked && <section className="section"><Empty>เลือกวันในปฏิทินเพื่อดูรายชื่อ</Empty></section>}
    </>
  );
}
