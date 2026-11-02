import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LABELS, type AceiArbCoverage, type PatientSummary, type UrgencyColor } from '@rx/shared';
import { api } from '../api';
import { ColumnChart, ShareBars, StackedBar, StatTile } from '../components/charts';
import { ErrorState, Loading } from '../components/ui';
import { num, thDate } from '../format';
import type { MonthlySummary } from './Reports';

interface DashboardData {
  counts: {
    total: number;
    byColor: Record<UrgencyColor, number>;
    byStage: Record<string, number>;
    pendingDecisions: number;
  };
  red: PatientSummary[];
  missed: PatientSummary[];
  upcoming: PatientSummary[];
  insufficientData: PatientSummary[];
  month: MonthlySummary;
  trend: MonthlySummary[];
  aceiArb: AceiArbCoverage;
  rules: { version: number; approved: boolean };
}

const URGENCY_COLORS: Record<UrgencyColor, string> = {
  red: 'var(--red)',
  orange: 'var(--s4)',
  yellow: 'var(--s3)',
  green: 'var(--green)',
};

const STAGES = ['1', '2', '3a', '3b', '4', '5'] as const;

const monthLabel = (ym: string) =>
  new Intl.DateTimeFormat('th-TH', { month: 'short', timeZone: 'UTC' }).format(new Date(`${ym}-01T00:00:00Z`));

const longDate = new Intl.DateTimeFormat('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

function PatientLine({ p, detail }: { p: PatientSummary; detail: string }) {
  return (
    <li>
      <Link to={`/patients/${p.id}`}>
        {p.title}{p.firstName} {p.lastName}
      </Link>{' '}
      <span className="muted">HN {p.hn}</span>
      <div className="muted" style={{ fontSize: '0.9rem' }}>{detail}</div>
    </li>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({ queryKey: ['dashboard'], queryFn: () => api<DashboardData>('/dashboard') });
  if (isLoading) return <Loading />;
  if (error || !data) return <ErrorState error={error} />;

  const { counts, month, trend, aceiArb } = data;
  const previous = trend[trend.length - 2];
  const visitDelta = previous ? month.visits - previous.visits : null;
  const aceiKnown = aceiArb.yes + aceiArb.no;
  const stageMax = Math.max(1, ...STAGES.map((s) => counts.byStage[s] ?? 0));

  return (
    <>
      <div className="hello">
        <div>
          <h1>งานวันนี้</h1>
          <span className="date">{longDate.format(new Date())}</span>
        </div>
        <Link className="btn" to="/patients/new">ลงทะเบียนผู้ป่วย</Link>
      </div>

      <div className="stats">
        <StatTile label="ผู้ป่วยในคลินิก" value={num(counts.total)} note="คนที่กำลังติดตาม" />
        <StatTile
          label={`มาติดตามเดือนนี้ (${monthLabel(month.month)})`}
          value={num(month.visits)}
          note={
            visitDelta === null
              ? 'ครั้ง'
              : `${visitDelta >= 0 ? '+' : ''}${visitDelta} ครั้ง เทียบกับ${monthLabel(previous!.month)}`
          }
        />
        <StatTile
          label="เลยนัด"
          value={num(data.missed.length)}
          note={`ใกล้ถึงนัดอีก ${data.upcoming.length} คน`}
          tone={data.missed.length > 0 ? 'alert' : undefined}
        />
        <StatTile
          label="ได้รับยากลุ่ม ACEI/ARB"
          value={aceiKnown ? `${Math.round((aceiArb.yes / aceiKnown) * 100)}%` : '–'}
          note={`${aceiArb.yes} จาก ${aceiKnown} คนที่บันทึกแล้ว`}
        />
      </div>

      <div className="dash-grid">
        <div className="section span-12">
          <h3 className="tab">ความเร่งด่วนในการติดตาม</h3>
          <p className="section-sub">กดที่แถบสีเพื่อดูรายชื่อ{!data.rules.approved && ' (เกณฑ์ยังเป็นค่าเริ่มต้น รอทีมคลินิกอนุมัติ)'}</p>
          <StackedBar
            segments={(['red', 'orange', 'yellow', 'green'] as const).map((c) => ({
              key: c,
              label: LABELS.urgency[c],
              value: counts.byColor[c],
              color: URGENCY_COLORS[c],
            }))}
            onSelect={(c) => navigate(`/patients?color=${c}`)}
          />
        </div>
      </div>

      <div className="dash-grid">
        <div className="section span-7">
          <h3 className="tab">5 ระยะของโรคไตเรื้อรัง (CKD)</h3>
          <div className="stage-rows">
            {STAGES.map((s) => {
              const n = counts.byStage[s] ?? 0;
              return (
                <Link key={s} className="stage-row" to={`/patients?stage=${s}`} aria-label={`ระยะ ${s} จำนวน ${n} คน`}>
                  <span className={`num s${s.charAt(0)}`}>{s}</span>
                  <span className="what">
                    {LABELS.ckdStage[s].meaning}
                    <small>{LABELS.ckdStage[s].range}</small>
                    <span className="bar-mini"><span style={{ width: `${(n / stageMax) * 100}%` }} /></span>
                  </span>
                  <span className="count">{n} คน</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="section span-5">
          <h3 className="tab">การมาติดตาม 6 เดือนล่าสุด</h3>
          <p className="section-sub">จำนวนครั้งที่ผู้ป่วยมาพบเภสัชกร แท่งเข้มคือเดือนปัจจุบัน</p>
          <ColumnChart data={trend.map((m) => ({ label: monthLabel(m.month), value: m.visits }))} unit="ครั้ง" />
        </div>
      </div>

      <div className="dash-grid">
        <div className="section span-6">
          <h3 className="tab">สิ่งที่พบจากการให้คำปรึกษาเดือนนี้</h3>
          <p className="section-sub">สัดส่วนจากการมาติดตาม {month.visits} ครั้ง</p>
          <ShareBars
            total={month.visits}
            unit="ครั้ง"
            rows={[
              { label: 'กินยาไม่ถูกต้อง', value: month.incorrectTaking },
              { label: 'กินยาสมุนไพร/ยาแก้ปวด', value: month.herbalOrPainkiller },
              { label: 'ไม่คุมอาหาร', value: month.dietUncontrolled },
              { label: 'เครื่องปรุงควรปรับลด', value: month.seasoningReduceNeeded },
            ]}
          />
          <p className="muted" style={{ margin: '14px 0 0', fontSize: '0.9rem' }}>
            DRP เดือนนี้ {month.drps} รายการ, แพทย์ยอมรับ {month.drpsAccepted}, รอแพทย์ตัดสินใจทั้งหมด {counts.pendingDecisions}
          </p>
        </div>

        <div className="section span-6">
          <h3 className="tab">ยากลุ่ม ACEI/ARB</h3>
          <p className="section-sub">จากการติดตามครั้งล่าสุดของผู้ป่วยแต่ละคน</p>
          <StackedBar
            segments={[
              { key: 'yes', label: 'มี', value: aceiArb.yes, color: 'var(--ink)' },
              { key: 'no', label: 'ไม่มี', value: aceiArb.no, color: '#9aa5bf' },
              { key: 'unknown', label: 'ยังไม่ได้บันทึก', value: aceiArb.unknown, color: '#dfe3ea' },
            ]}
          />
        </div>
      </div>

      <div className="dash-grid">
        <div className="section span-6">
          <h3 className="tab">ต้องติดตามด่วน (สีแดง)</h3>
          {data.red.length === 0 ? (
            <p className="muted">ไม่มีผู้ป่วยสีแดง</p>
          ) : (
            <ul className="list-plain">
              {data.red.map((p) => (
                <PatientLine key={p.id} p={p} detail={p.reasons.join(', ')} />
              ))}
            </ul>
          )}
        </div>
        <div className="section span-6">
          <h3 className="tab">นัดหมาย</h3>
          <h3 style={{ color: 'var(--red)' }}>เลยนัด {data.missed.length} คน</h3>
          <ul className="list-plain">
            {data.missed.map((p) => (
              <PatientLine key={p.id} p={p} detail={`นัด ${thDate(p.nextAppointment)}`} />
            ))}
          </ul>
          <h3 style={{ marginTop: 14 }}>ใกล้ถึงนัด {data.upcoming.length} คน</h3>
          <ul className="list-plain">
            {data.upcoming.map((p) => (
              <PatientLine key={p.id} p={p} detail={`นัด ${thDate(p.nextAppointment)}`} />
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
