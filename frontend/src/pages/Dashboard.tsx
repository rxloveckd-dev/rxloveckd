import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LABELS, type PatientSummary } from '@rx/shared';
import { api } from '../api';
import { ErrorState, Loading, Section, Stage, Urgency } from '../components/ui';
import { num, pct, thDate } from '../format';
import { MonthlyFigures, type MonthlySummary } from './Reports';

interface DashboardData {
  counts: {
    total: number;
    byColor: Record<'red' | 'orange' | 'yellow' | 'green', number>;
    byStage: Record<string, number>;
    pendingDecisions: number;
  };
  red: PatientSummary[];
  missed: PatientSummary[];
  upcoming: PatientSummary[];
  insufficientData: PatientSummary[];
  month: MonthlySummary;
  rules: { version: number; approved: boolean };
}

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
  const { counts } = data;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>งานวันนี้</h1>
          <p className="muted" style={{ margin: 0 }}>
            ผู้ป่วยในคลินิก {num(counts.total)} คน, รอแพทย์ตัดสินใจ DRP {num(counts.pendingDecisions)} รายการ
          </p>
        </div>
        <Link className="btn" to="/patients/new">ลงทะเบียนผู้ป่วย</Link>
      </div>
      {!data.rules.approved && (
        <p className="muted" style={{ fontSize: '0.9rem' }}>
          เกณฑ์สีและระยะโรคใช้ค่าเริ่มต้นฉบับที่ {data.rules.version} ซึ่งยังไม่ผ่านการอนุมัติทางคลินิก
        </p>
      )}

      <div className="triage" aria-label="จำนวนผู้ป่วยตามสีความเร่งด่วน">
        {(['red', 'orange', 'yellow', 'green'] as const).map((c) => (
          <div key={c} className={`t-${c}`}>
            <Urgency color={c} />
            <div className="count" style={{ marginTop: 10 }}>{num(counts.byColor[c])}</div>
            <Link to={`/patients?color=${c}`} className="muted">ดูรายชื่อ</Link>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <Section title="ต้องติดตามด่วน (สีแดง)">
          {data.red.length === 0 ? (
            <p className="muted">ไม่มีผู้ป่วยสีแดง</p>
          ) : (
            <ul className="list-plain">
              {data.red.map((p) => (
                <PatientLine key={p.id} p={p} detail={p.reasons.join(', ')} />
              ))}
            </ul>
          )}
        </Section>
        <Section title="นัดหมาย">
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
        </Section>
      </div>

      <div className="grid-2">
        <Section title="5 ระยะของโรคไตเรื้อรัง (CKD)">
          <div className="stage-rows">
            {(['1', '2', '3a', '3b', '4', '5'] as const).map((s) => (
              <Link key={s} className="stage-row" to={`/patients?stage=${s}`} aria-label={`ระยะ ${s} จำนวน ${counts.byStage[s]} คน`}>
                <span className={`num s${s.charAt(0)}`}>{s}</span>
                <span className="what">
                  {LABELS.ckdStage[s].meaning}
                  <small>{LABELS.ckdStage[s].range}</small>
                </span>
                <span className="count">{counts.byStage[s]} คน</span>
              </Link>
            ))}
          </div>
        </Section>
        <Section title={`สรุปเดือนนี้ (${data.month.month})`} action={<Link to="/reports">ดูรายงาน</Link>}>
          <MonthlyFigures s={data.month} compact />
        </Section>
      </div>

      {data.insufficientData.length > 0 && (
        <Section title="ข้อมูลแล็บไม่พอหรือเก่าเกินกำหนด">
          <div className="table-wrap">
            <table className="stack">
              <thead>
                <tr><th>ผู้ป่วย</th><th>HN</th><th>ระยะ</th><th>GFR ล่าสุด</th><th className="num">เปลี่ยนแปลง</th></tr>
              </thead>
              <tbody>
                {data.insufficientData.map((p) => (
                  <tr key={p.id} className="clickable" onClick={() => navigate(`/patients/${p.id}`)}>
                    <td className="lead">{p.title}{p.firstName} {p.lastName}</td>
                    <td data-label="HN">{p.hn}</td>
                    <td data-label="ระยะ"><Stage stage={p.stage} /></td>
                    <td data-label="GFR ล่าสุด">{p.latestGfr ? `${num(p.latestGfr.value, 1)} (${thDate(p.latestGfr.collectedAt)})` : 'ยังไม่มีผล'}</td>
                    <td data-label="เปลี่ยนแปลง" className="num">{pct(p.gfrChangePct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </>
  );
}
