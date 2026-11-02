import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LABELS, type MonthlySummary } from '@rx/shared';
import { api, downloadMonthlyReport } from '../api';
import { ColumnChart, CountUp, ShareBars, StackedBar } from '../components/charts';
import { ErrorState, Loading } from '../components/ui';

export type { MonthlySummary };

const monthShort = (ym: string) =>
  new Intl.DateTimeFormat('th-TH', { month: 'short', timeZone: 'UTC' }).format(new Date(`${ym}-01T00:00:00Z`));
const monthLong = (ym: string) =>
  new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${ym}-01T00:00:00Z`));

function shiftMonth(ym: string, by: number) {
  const [y, m] = ym.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(y, m - 1 + by, 1)).toISOString().slice(0, 7);
}

const pctOf = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);

/** Compact KPI: label, animated value, change versus the previous month. */
function Kpi({ label, value, prev, unit, suffix }: { label: string; value: number; prev?: number; unit: string; suffix?: string }) {
  const d = prev === undefined ? null : value - prev;
  return (
    <div className="kpi">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">
        <CountUp value={value} suffix={suffix} />
      </span>
      {d !== null && (
        <span className={`kpi-delta ${d > 0 ? 'up' : d < 0 ? 'down' : ''}`}>
          {d === 0 ? 'เท่าเดือนก่อน' : `${d > 0 ? '▲' : '▼'} ${Math.abs(d)} ${unit} จากเดือนก่อน`}
        </span>
      )}
    </div>
  );
}

export function Reports() {
  const thisMonth = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(thisMonth);
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
  const categories = s ? Object.entries(s.drpsByCategory).sort((a, b) => b[1] - a[1]) : [];

  return (
    <div className="report">
      <div className="report-head">
        <div>
          <h1>สรุปรายเดือน</h1>
          <div className="month-nav" role="group" aria-label="เลือกเดือน">
            <button className="btn secondary small" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="เดือนก่อน">◀</button>
            <label className="month-pick">
              <span>{valid ? monthLong(month) : 'เลือกเดือน'}</span>
              <input type="month" value={month} max={thisMonth} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="เลือกเดือน" />
            </label>
            <button
              className="btn secondary small"
              onClick={() => setMonth(shiftMonth(month, 1))}
              disabled={month >= thisMonth}
              aria-label="เดือนถัดไป"
            >
              ▶
            </button>
            {month !== thisMonth && (
              <button className="btn secondary small" onClick={() => setMonth(thisMonth)}>เดือนนี้</button>
            )}
          </div>
        </div>
        <button className="btn" onClick={() => downloadMonthlyReport(month)} disabled={!valid}>ดาวน์โหลด Excel</button>
      </div>

      {isLoading ? (
        <Loading />
      ) : error || !s ? (
        <ErrorState error={error} />
      ) : (
        <div className={isFetching ? 'report-body refreshing' : 'report-body'}>
          <div className="kpis">
            <Kpi label="มาติดตาม" value={s.visits} prev={prev?.visits} unit="ครั้ง" />
            <Kpi label="ผู้ป่วยที่มา" value={s.patientsSeen} prev={prev?.patientsSeen} unit="คน" />
            <Kpi label="ลงทะเบียนใหม่" value={s.newEnrollments} prev={prev?.newEnrollments} unit="คน" />
            <Kpi label="DRP ที่พบ" value={s.drps} prev={prev?.drps} unit="รายการ" />
            <Kpi label="จำหน่าย" value={s.discharges} prev={prev?.discharges} unit="คน" />
          </div>

          <div className="report-grid">
            <div className="card wide">
              <div className="card-head">
                <h3>การมาติดตาม 12 เดือน</h3>
                <span className="muted">กดที่แท่งเพื่อดูเดือนนั้น</span>
              </div>
              <ColumnChart
                data={trend.map((m) => ({ label: monthShort(m.month), value: m.visits }))}
                unit="ครั้ง"
                height={200}
                width={900}
                onSelect={(i) => trend[i] && setMonth(trend[i].month)}
              />
            </div>

            <div className="card">
              <div className="card-head">
                <h3>DRP</h3>
                <span className="muted">{s.drps ? `แพทย์ยอมรับ ${pctOf(s.drpsAccepted, s.drps)}%` : 'ไม่มีในเดือนนี้'}</span>
              </div>
              {s.drps > 0 && (
                <>
                  <StackedBar
                    unit="รายการ"
                    segments={[
                      { key: 'accepted', label: 'ยอมรับ', value: s.drpsAccepted, color: 'var(--ink)' },
                      { key: 'other', label: 'รอผล/ไม่ยอมรับ', value: s.drps - s.drpsAccepted, color: '#c3c9d6' },
                    ]}
                  />
                  <ShareBars
                    total={s.drps}
                    unit="รายการ"
                    rows={categories.slice(0, 4).map(([k, v]) => ({
                      label: LABELS.drpCategory[k as keyof typeof LABELS.drpCategory] ?? k,
                      value: v,
                    }))}
                  />
                </>
              )}
            </div>

            <div className="card">
              <div className="card-head">
                <h3>สิ่งที่พบจากการให้คำปรึกษา</h3>
                <span className="muted">จาก {s.visits} ครั้ง</span>
              </div>
              <ShareBars
                total={s.visits}
                unit="ครั้ง"
                rows={[
                  { label: 'กินยาไม่ถูกต้อง', value: s.incorrectTaking },
                  { label: 'ยาสมุนไพร/ยาแก้ปวด', value: s.herbalOrPainkiller },
                  { label: 'ไม่คุมอาหาร', value: s.dietUncontrolled },
                  { label: 'เครื่องปรุงควรลด', value: s.seasoningReduceNeeded },
                ]}
              />
            </div>

            <div className="card">
              <div className="card-head">
                <h3>การจำหน่ายผู้ป่วย</h3>
                <span className="muted">{s.discharges} คน</span>
              </div>
              {s.discharges === 0 ? (
                <p className="muted" style={{ margin: 0 }}>ไม่มีการจำหน่ายในเดือนนี้</p>
              ) : (
                <ShareBars
                  total={s.discharges}
                  unit="คน"
                  rows={Object.entries(s.dischargesByReason)
                    .sort((a, b) => b[1] - a[1])
                    .map(([code, n]) => ({
                      label: `${code} ${LABELS.discharge[code as keyof typeof LABELS.discharge] ?? ''}`,
                      value: n,
                    }))}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
