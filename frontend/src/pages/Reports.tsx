import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LABELS, type MonthlySummary } from '@rx/shared';
import { api, downloadMonthlyReport } from '../api';
import { ColumnChart, ShareBars, StackedBar, StatTile } from '../components/charts';
import { ErrorState, Loading } from '../components/ui';
import { num } from '../format';

export type { MonthlySummary };

const monthShort = (ym: string) =>
  new Intl.DateTimeFormat('th-TH', { month: 'short', timeZone: 'UTC' }).format(new Date(`${ym}-01T00:00:00Z`));
const monthLong = (ym: string) =>
  new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${ym}-01T00:00:00Z`));

/** "▲ 3 จาก ต.ค." / "▼ 2 จาก ต.ค." / "เท่ากับ ต.ค." */
function delta(current: number, previous: MonthlySummary | undefined, pick: (m: MonthlySummary) => number) {
  if (!previous) return undefined;
  const d = current - pick(previous);
  const from = `${monthShort(previous.month)}`;
  if (d === 0) return `เท่ากับ${from}`;
  return `${d > 0 ? '▲' : '▼'} ${Math.abs(d)} จาก${from}`;
}

const pctOf = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);

export function Reports() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const valid = /^\d{4}-\d{2}$/.test(month);
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['report-trend', month],
    queryFn: () => api<{ items: MonthlySummary[] }>(`/reports/trend?month=${month}&months=12`),
    enabled: valid,
    placeholderData: (prev) => prev,
  });

  const trend = data?.items ?? [];
  const s = trend[trend.length - 1];
  const prev = trend[trend.length - 2];
  const drpOther = s ? s.drps - s.drpsAccepted : 0;
  const categories = s
    ? Object.entries(s.drpsByCategory).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>สรุปรายเดือน</h1>
          <span className="muted">{valid ? monthLong(month) : 'เลือกเดือน'}</span>
        </div>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div className="field">
            <label htmlFor="m">เดือน</label>
            <input id="m" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <button className="btn" onClick={() => downloadMonthlyReport(month)} disabled={!valid}>
            ดาวน์โหลด Excel
          </button>
        </div>
      </div>

      {isLoading ? (
        <Loading />
      ) : error || !s ? (
        <ErrorState error={error} />
      ) : (
        <div style={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity 0.2s' }}>
          <div className="stats">
            <StatTile label="มาติดตาม (ครั้ง)" value={num(s.visits)} note={delta(s.visits, prev, (m) => m.visits)} />
            <StatTile label="ผู้ป่วยที่มาติดตาม (คน)" value={num(s.patientsSeen)} note={delta(s.patientsSeen, prev, (m) => m.patientsSeen)} />
            <StatTile label="ลงทะเบียนใหม่ (คน)" value={num(s.newEnrollments)} note={delta(s.newEnrollments, prev, (m) => m.newEnrollments)} />
            <StatTile
              label="DRP ที่พบ (รายการ)"
              value={num(s.drps)}
              note={s.drps ? `แพทย์ยอมรับ ${pctOf(s.drpsAccepted, s.drps)}%` : delta(s.drps, prev, (m) => m.drps)}
            />
          </div>

          <div className="dash-grid">
            <div className="section span-12">
              <h3 className="tab">การมาติดตาม 12 เดือน</h3>
              <p className="section-sub">จำนวนครั้งที่ผู้ป่วยมาพบเภสัชกร แท่งเข้มคือเดือนที่เลือก</p>
              <ColumnChart data={trend.map((m) => ({ label: monthShort(m.month), value: m.visits }))} unit="ครั้ง" />
            </div>
          </div>

          <div className="dash-grid">
            <div className="section span-7">
              <h3 className="tab">สิ่งที่พบจากการให้คำปรึกษา</h3>
              <p className="section-sub">
                สัดส่วนจากการมาติดตาม {s.visits} ครั้ง
                {prev ? `, เดือนก่อน ${prev.visits} ครั้ง` : ''}
              </p>
              <ShareBars
                total={s.visits}
                unit="ครั้ง"
                rows={[
                  { label: 'กินยาไม่ถูกต้อง', value: s.incorrectTaking },
                  { label: 'กินยาสมุนไพร/ยาแก้ปวด', value: s.herbalOrPainkiller },
                  { label: 'ไม่คุมอาหาร', value: s.dietUncontrolled },
                  { label: 'เครื่องปรุงควรปรับลด', value: s.seasoningReduceNeeded },
                ]}
              />
              {prev && prev.visits > 0 && (
                <p className="muted" style={{ margin: '14px 0 0', fontSize: '0.9rem' }}>
                  เดือนก่อน: กินยาไม่ถูกต้อง {pctOf(prev.incorrectTaking, prev.visits)}%, ยาสมุนไพร/ยาแก้ปวด{' '}
                  {pctOf(prev.herbalOrPainkiller, prev.visits)}%, ไม่คุมอาหาร {pctOf(prev.dietUncontrolled, prev.visits)}%
                </p>
              )}
            </div>

            <div className="section span-5">
              <h3 className="tab">ปัญหาจากการใช้ยา (DRP)</h3>
              {s.drps === 0 ? (
                <p className="muted">ไม่มี DRP ในเดือนนี้</p>
              ) : (
                <>
                  <p className="section-sub">การตัดสินใจของแพทย์ต่อคำแนะนำของเภสัชกร</p>
                  <StackedBar
                    unit="รายการ"
                    segments={[
                      { key: 'accepted', label: 'ยอมรับ', value: s.drpsAccepted, color: 'var(--ink)' },
                      { key: 'other', label: 'รอผล/ไม่ยอมรับ', value: drpOther, color: '#c3c9d6' },
                    ]}
                  />
                  <h3 style={{ margin: '16px 0 8px', fontSize: '1rem' }}>แยกตามประเภท</h3>
                  <ShareBars
                    total={s.drps}
                    unit="รายการ"
                    rows={categories.map(([k, v]) => ({
                      label: LABELS.drpCategory[k as keyof typeof LABELS.drpCategory] ?? k,
                      value: v,
                    }))}
                  />
                </>
              )}
            </div>
          </div>

          <div className="dash-grid">
            <div className="section span-12">
              <h3 className="tab">การจำหน่ายผู้ป่วย</h3>
              {s.discharges === 0 ? (
                <p className="muted" style={{ margin: 0 }}>ไม่มีการจำหน่ายผู้ป่วยในเดือนนี้</p>
              ) : (
                <>
                  <p className="section-sub">
                    จำหน่าย {s.discharges} คน{prev ? `, เดือนก่อน ${prev.discharges} คน` : ''}
                  </p>
                  <ShareBars
                    total={s.discharges}
                    unit="คน"
                    rows={Object.entries(s.dischargesByReason)
                      .sort((a, b) => a[0].localeCompare(b[0]))
                      .map(([code, n]) => ({
                        label: `${code} ${LABELS.discharge[code as keyof typeof LABELS.discharge] ?? ''}`,
                        value: n,
                      }))}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}
      <p className="muted" style={{ fontSize: '0.9rem', marginTop: 18 }}>
        ไฟล์ Excel มีเฉพาะตัวเลขสรุป ไม่มีชื่อหรือเลขประจำตัวผู้ป่วย
      </p>
    </>
  );
}
