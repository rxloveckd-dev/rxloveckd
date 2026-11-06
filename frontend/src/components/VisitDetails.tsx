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

const ROW_LABELS = {
  aceiArb: 'ยากลุ่ม ACEI/ARB',
  doctorMedChange: 'แพทย์ปรับเปลี่ยนยา',
  leftovers: 'รายการยาที่เหลือ',
  herbal: 'ยาสมุนไพร/ยาแก้ปวด',
  note: 'Note เภสัชกร',
  urgency: 'สีความเร่งด่วน',
};

/** A sticker is 7.5 cm wide, so its label column has to stay narrow. */
const STICKER_ROW_LABELS: typeof ROW_LABELS = {
  aceiArb: 'ACEI/ARB',
  doctorMedChange: 'แพทย์ปรับยา',
  leftovers: 'ยาที่เหลือ',
  herbal: 'สมุนไพร/ยาแก้ปวด',
  note: 'Note',
  urgency: 'ความเร่งด่วน',
};

/** One visit as label and value rows; the card and both printed forms use this, so they cannot drift apart. */
export function VisitDetails({ visit: v, shortLabels = false }: { visit: VisitRow; shortLabels?: boolean }) {
  const label = shortLabels ? STICKER_ROW_LABELS : ROW_LABELS;
  return (
    <dl className="visit-rows">
      <dt className="muted">{label.aceiArb}</dt>
      <dd style={{ margin: 0 }}>
        {v.aceiArb ? LABELS.aceiArb[v.aceiArb] : '–'}
        {v.aceiArb === 'yes' && v.aceiArbDrug ? ` (${LABELS.aceiArbDrug[v.aceiArbDrug]})` : ''}
        {v.aceiArb === 'no' && v.aceiArbNoReason ? ` เพราะ${v.aceiArbNoReason}` : ''}
      </dd>
      <dt className="muted">{label.doctorMedChange}</dt>
      <dd style={{ margin: 0 }}>
        {v.doctorMedChange ? LABELS.doctorMedChange[v.doctorMedChange] : '–'}
        {v.doctorMedChange === 'yes' && v.doctorMedChangeDetail ? `: ${v.doctorMedChangeDetail}` : ''}
      </dd>
      <dt className="muted">การกินยา</dt>
      <dd style={{ margin: 0 }} className={v.medicationTaking === 'incorrect' ? 'down' : ''}>
        {LABELS.medicationTaking[v.medicationTaking]}
        {v.medicationTaking === 'incorrect' && v.medicationTakingDetail ? `: ${v.medicationTakingDetail}` : ''}
      </dd>
      <dt className="muted">{label.leftovers}</dt>
      <dd style={{ margin: 0 }}><LeftoverList stored={v.leftoverMeds} /></dd>
      <dt className="muted">{label.herbal}</dt>
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
      <dt className="muted">{label.note}</dt>
      <dd style={{ margin: 0 }}>{v.furtherAdjustments || '–'}</dd>
      <dt className="muted">นัดครั้งต่อไป</dt>
      <dd style={{ margin: 0 }}>
        {thDate(v.nextAppointment)}
        {v.nextSeePharmacist ? ` (${LABELS.nextSeePharmacist[v.nextSeePharmacist]})` : ''}
      </dd>
      <dt className="muted">{label.urgency}</dt>
      <dd style={{ margin: 0 }}><Urgency color={v.urgencyColor ?? null} /></dd>
      <dt className="muted">เภสัชกร</dt>
      <dd style={{ margin: 0 }}>{v.pharmacistName}</dd>
    </dl>
  );
}

type PrintedPatient = Pick<PatientProfile, 'title' | 'firstName' | 'lastName' | 'hn' | 'nationalIdMasked' | 'age' | 'sex'>;

function useHidePageForPrint() {
  useLayoutEffect(() => {
    document.body.classList.add('printing');
    return () => document.body.classList.remove('printing');
  }, []);
}

/** The paper copy: says whose visit it is, since the page around the card is not printed. */
export function VisitPrintSheet({ patient: p, visit, printedBy }: { patient: PrintedPatient; visit: VisitRow; printedBy?: string }) {
  useHidePageForPrint();
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

/**
 * A 7.5 x 5.5 cm label for the patient's book, printed in black on a roll. It names the patient by
 * name and HN only, because the book leaves the clinic. The table header repeats on each label,
 * so a visit too long for one label still says whose it is on the next.
 */
export function VisitPrintSticker({ patient: p, visit }: { patient: PrintedPatient; visit: VisitRow }) {
  useHidePageForPrint();
  return createPortal(
    <article className="print-sheet sticker">
      <table>
        <thead>
          <tr>
            <th>
              <div className="sticker-patient">
                <b>{p.title}{p.firstName} {p.lastName}</b>
                <span>HN {p.hn}</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <b>ติดตามครั้งที่ {visit.visitNo} วันที่ {thDate(visit.visitDate)}</b>
              <VisitDetails visit={visit} shortLabels />
            </td>
          </tr>
        </tbody>
      </table>
    </article>,
    document.body,
  );
}

export type PrintFormat = 'sheet' | 'sticker';

/** Logs first, so a visit never reaches paper without a record of it; if the log fails, nothing prints. */
export function useVisitPrint(log: (visitId: string) => Promise<unknown> = logVisitPrint) {
  const [visit, setVisit] = useState<VisitRow | null>(null);
  const [format, setFormat] = useState<PrintFormat>('sheet');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const done = () => setVisit(null);
    window.addEventListener('afterprint', done);
    return () => window.removeEventListener('afterprint', done);
  }, []);

  async function print(v: VisitRow, as: PrintFormat = 'sheet') {
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
    flushSync(() => {
      setFormat(as);
      setVisit(v);
    });
    window.print();
  }

  return { visit, format, busy, error, print };
}
