import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LABELS } from '@rx/shared';
import { api } from '../api';
import { ErrorState, Field, Loading, Section } from '../components/ui';
import { num } from '../format';

export interface MonthlySummary {
  month: string;
  visits: number;
  patientsSeen: number;
  newEnrollments: number;
  incorrectTaking: number;
  herbalOrPainkiller: number;
  dietUncontrolled: number;
  seasoningReduceNeeded: number;
  drps: number;
  drpsAccepted: number;
  drpsByCategory: Record<string, number>;
}

export function MonthlyFigures({ s, compact = false }: { s: MonthlySummary; compact?: boolean }) {
  const rows: [string, number][] = [
    ['จำนวนครั้งที่มาติดตาม', s.visits],
    ['ผู้ป่วยที่มาติดตาม (คน)', s.patientsSeen],
    ['ลงทะเบียนใหม่', s.newEnrollments],
    ['กินยาไม่ถูกต้อง', s.incorrectTaking],
    ['กินยาสมุนไพร/ยาแก้ปวด', s.herbalOrPainkiller],
    ['ไม่คุมอาหาร', s.dietUncontrolled],
    ...(compact ? [] : ([['เครื่องปรุงควรปรับลด', s.seasoningReduceNeeded]] as [string, number][])),
    ['DRP ที่พบ', s.drps],
    ['DRP ที่แพทย์ยอมรับ', s.drpsAccepted],
  ];
  return (
    <table>
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}><td>{label}</td><td className="num"><b>{num(value)}</b></td></tr>
        ))}
      </tbody>
    </table>
  );
}

export function Reports() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const { data, isLoading, error } = useQuery({
    queryKey: ['report', month],
    queryFn: () => api<MonthlySummary>(`/reports/monthly?month=${month}`),
    enabled: /^\d{4}-\d{2}$/.test(month),
  });

  return (
    <>
      <div className="page-head">
        <h1>สรุปรายเดือน</h1>
        <div className="row">
          <Field label="เดือน" htmlFor="m">
            <input id="m" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </Field>
          <a className="btn" style={{ alignSelf: 'end' }} href={`/api/reports/monthly.xlsx?month=${month}`} download>
            ดาวน์โหลด Excel
          </a>
        </div>
      </div>
      {isLoading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorState error={error} />
      ) : (
        <div className="grid-2">
          <Section title="ภาพรวมการติดตาม">
            <MonthlyFigures s={data} />
          </Section>
          <Section title="DRP แยกตามประเภท">
            {Object.keys(data.drpsByCategory).length === 0 ? (
              <p className="muted">ไม่มี DRP ในเดือนนี้</p>
            ) : (
              <table>
                <tbody>
                  {Object.entries(data.drpsByCategory).map(([k, v]) => (
                    <tr key={k}>
                      <td>{LABELS.drpCategory[k as keyof typeof LABELS.drpCategory] ?? k}</td>
                      <td className="num"><b>{num(v)}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
        </div>
      )}
      <p className="muted" style={{ fontSize: '0.9rem' }}>ไฟล์ Excel มีเฉพาะตัวเลขสรุป ไม่มีชื่อหรือเลขประจำตัวผู้ป่วย และระบบบันทึกการดาวน์โหลดทุกครั้ง</p>
    </>
  );
}
