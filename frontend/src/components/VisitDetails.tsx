import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { LABELS, parseLeftovers, type UrgencyColor } from '@rx/shared';
import { logVisitPrint, type PatientProfile } from '../api';
import { thDate } from '../format';
import { leftoverText } from './LeftoverEditor';
import { Urgency } from './ui';

export interface VisitRow {
  id: string;
  visitNo: number;
  visitDate: string;
  medicationTaking: 'correct' | 'incorrect';
  medicationTakingDetail?: string | null;
  leftoverMeds?: string | null;
  dietDetail?: string | null;
  seasoningDetail?: string | null;
  herbalOrPainkiller: boolean;
  herbalDetail: string | null;
  dietControlled: boolean;
  seasoning: 'reduce_needed' | 'adjusted';
  furtherAdjustments: string | null;
  nextAppointment: string | null;
  aceiArb: 'yes' | 'no' | null;
  aceiArbNoReason: string | null;
  aceiArbDrug?: 'enalapril' | 'losartan' | null;
  doctorMedChange?: 'yes' | 'no' | null;
  doctorMedChangeDetail?: string | null;
  urgencyColor?: UrgencyColor | null;
  nextSeePharmacist?: 'yes' | 'no' | null;
  pharmacistName: string;
}

/** รายการยาที่เหลือ as short lines; text saved before the list existed is shown as is. */
function LeftoverList({ stored }: { stored: string | null | undefined }) {
  const { items, legacy } = parseLeftovers(stored);
  if (legacy) return <>{legacy}</>;
  if (!items.length) return <>–</>;
  return (
    <ul style={{ margin: 0, paddingLeft: 18 }}>
      {items.map((i, n) => <li key={n}>{leftoverText(i)}</li>)}
    </ul>
  );
}

/** One visit as label and value rows; the card and the printed sheet both use this. */
export function VisitDetails({ visit: v }: { visit: VisitRow }) {
  return (
    <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 14px' }}>
      <dt className="muted">ยากลุ่ม ACEI/ARB</dt>
      <dd style={{ margin: 0 }}>
        {v.aceiArb ? LABELS.aceiArb[v.aceiArb] : '–'}
        {v.aceiArb === 'yes' && v.aceiArbDrug ? ` (${LABELS.aceiArbDrug[v.aceiArbDrug]})` : ''}
        {v.aceiArb === 'no' && v.aceiArbNoReason ? ` เพราะ${v.aceiArbNoReason}` : ''}
      </dd>
      <dt className="muted">แพทย์ปรับเปลี่ยนยา</dt>
      <dd style={{ margin: 0 }}>
        {v.doctorMedChange ? LABELS.doctorMedChange[v.doctorMedChange] : '–'}
        {v.doctorMedChange === 'yes' && v.doctorMedChangeDetail ? `: ${v.doctorMedChangeDetail}` : ''}
      </dd>
      <dt className="muted">การกินยา</dt>
      <dd style={{ margin: 0 }} className={v.medicationTaking === 'incorrect' ? 'down' : ''}>
        {LABELS.medicationTaking[v.medicationTaking]}
        {v.medicationTaking === 'incorrect' && v.medicationTakingDetail ? `: ${v.medicationTakingDetail}` : ''}
      </dd>
      <dt className="muted">รายการยาที่เหลือ</dt>
      <dd style={{ margin: 0 }}><LeftoverList stored={v.leftoverMeds} /></dd>
      <dt className="muted">ยาสมุนไพร/ยาแก้ปวด</dt>
      <dd style={{ margin: 0 }} className={v.herbalOrPainkiller ? 'down' : ''}>
        {v.herbalOrPainkiller ? `กิน${v.herbalDetail ? `: ${v.herbalDetail}` : ''}` : 'ไม่กิน'}
      </dd>
      <dt className="muted">อาหาร</dt>
      <dd style={{ margin: 0 }} className={v.dietControlled ? '' : 'down'}>{v.dietControlled ? 'คุม' : `ไม่คุม${v.dietDetail ? `: ${v.dietDetail}` : ''}`}</dd>
      <dt className="muted">เครื่องปรุง</dt>
      <dd style={{ margin: 0 }} className={v.seasoning === 'reduce_needed' ? 'down' : ''}>
        {LABELS.seasoning[v.seasoning]}
        {v.seasoning === 'reduce_needed' && v.seasoningDetail ? `: ${v.seasoningDetail}` : ''}
      </dd>
      <dt className="muted">Note เภสัชกร</dt>
      <dd style={{ margin: 0 }}>{v.furtherAdjustments || '–'}</dd>
      <dt className="muted">นัดครั้งต่อไป</dt>
      <dd style={{ margin: 0 }}>
        {thDate(v.nextAppointment)}
        {v.nextSeePharmacist ? ` (${LABELS.nextSeePharmacist[v.nextSeePharmacist]})` : ''}
      </dd>
      <dt className="muted">สีความเร่งด่วน</dt>
      <dd style={{ margin: 0 }}><Urgency color={v.urgencyColor ?? null} /></dd>
      <dt className="muted">เภสัชกร</dt>
      <dd style={{ margin: 0 }}>{v.pharmacistName}</dd>
    </dl>
  );
}

type PrintedPatient = Pick<PatientProfile, 'title' | 'firstName' | 'lastName' | 'hn' | 'nationalIdMasked' | 'age' | 'sex'>;

/** The paper copy: says whose visit it is, since the page around the card is not printed. */
export function VisitPrintSheet({ patient: p, visit, printedBy }: { patient: PrintedPatient; visit: VisitRow; printedBy?: string }) {
  useLayoutEffect(() => {
    document.body.classList.add('printing');
    return () => document.body.classList.remove('printing');
  }, []);
  return createPortal(
    <article className="print-sheet">
      <header>
        <b>คลินิกรักษ์ไต รพ.เขาชัยสน</b>
        <h1>{p.title}{p.firstName} {p.lastName}</h1>
        <p>HN {p.hn}, เลขบัตร {p.nationalIdMasked}, อายุ {p.age} ปี, {LABELS.sex[p.sex]}</p>
      </header>
      <h2>ติดตามครั้งที่ {visit.visitNo} วันที่ {thDate(visit.visitDate)}</h2>
      <VisitDetails visit={visit} />
      <footer>
        พิมพ์เมื่อ {new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
        {printedBy ? ` โดย ${printedBy}` : ''}
      </footer>
    </article>,
    document.body,
  );
}

/** Logs first, so a visit never reaches paper without a record of it; if the log fails, nothing prints. */
export function useVisitPrint(log: (visitId: string) => Promise<unknown> = logVisitPrint) {
  const [visit, setVisit] = useState<VisitRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const done = () => setVisit(null);
    window.addEventListener('afterprint', done);
    return () => window.removeEventListener('afterprint', done);
  }, []);

  async function print(v: VisitRow) {
    setError('');
    setBusy(true);
    try {
      await log(v.id);
    } catch {
      setError('พิมพ์ไม่สำเร็จ กรุณาลองใหม่');
      return;
    } finally {
      setBusy(false);
    }
    flushSync(() => setVisit(v));
    window.print();
  }

  return { visit, busy, error, print };
}
