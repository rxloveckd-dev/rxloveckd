import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { LABELS } from '@rx/shared';
import { usePatients } from '../api';
import { Empty, ErrorState, Loading, Stage, Urgency } from '../components/ui';
import { num, pct, thDate } from '../format';

export function Patients() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filters = {
    q: params.get('q') ?? '',
    stage: params.get('stage') ?? '',
    color: params.get('color') ?? '',
    status: params.get('status') ?? '',
    page: params.get('page') ?? '1',
  };
  const discharged = filters.status === 'discharged';
  const { data, isLoading, error } = usePatients(filters);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };
  const page = Number(filters.page);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{discharged ? 'ผู้ป่วยที่จำหน่ายแล้ว' : 'ผู้ป่วยในคลินิก'}</h1>
          <div className="status-tabs" role="group" aria-label="สถานะผู้ป่วย" style={{ marginTop: 8 }}>
            <button aria-pressed={!discharged} onClick={() => set('status', '')}>กำลังติดตาม</button>
            <button aria-pressed={discharged} onClick={() => set('status', 'discharged')}>จำหน่ายแล้ว</button>
          </div>
        </div>
        <Link className="btn" to="/patients/new">ลงทะเบียนผู้ป่วย</Link>
      </div>

      <div className="section row" role="search">
        <div className="field" style={{ flex: '1 1 240px' }}>
          <label htmlFor="q">ค้นหาชื่อหรือ HN</label>
          <input id="q" value={filters.q} onChange={(e) => set('q', e.target.value)} placeholder="เช่น สมชาย หรือ 0650001" />
        </div>
        <div className="field">
          <label htmlFor="stage">ระยะโรคไต</label>
          <select id="stage" value={filters.stage} onChange={(e) => set('stage', e.target.value)}>
            <option value="">ทุกระยะ</option>
            {['1', '2', '3a', '3b', '4', '5'].map((s) => <option key={s} value={s}>ระยะ {s}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="color">สีความเร่งด่วน</label>
          <select id="color" value={filters.color} onChange={(e) => set('color', e.target.value)}>
            <option value="">ทุกสี</option>
            {(['red', 'orange', 'yellow', 'green'] as const).map((c) => <option key={c} value={c}>{LABELS.urgency[c]}</option>)}
          </select>
        </div>
      </div>

      <div className="section">
        {isLoading ? (
          <Loading />
        ) : error || !data ? (
          <ErrorState error={error} />
        ) : data.items.length === 0 ? (
          <Empty>ไม่พบผู้ป่วยตามเงื่อนไขนี้ ลองล้างตัวกรอง หรือ <Link to="/patients/new">ลงทะเบียนผู้ป่วยใหม่</Link></Empty>
        ) : (
          <>
            <div className="table-wrap">
              <table className="stack">
                <thead>
                  <tr>
                    <th>สี</th><th>ชื่อ-สกุล</th><th>HN</th><th>อายุ</th><th>ระยะ</th>
                    <th className="num">GFR ล่าสุด</th><th className="num">เปลี่ยนแปลง</th><th>นัดครั้งต่อไป</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((p) => (
                    <tr key={p.id} className="clickable" onClick={() => navigate(`/patients/${p.id}`)}>
                      <td data-label="สี"><Urgency color={p.color} /></td>
                      <td className="lead">
                        <Link to={`/patients/${p.id}`} onClick={(e) => e.stopPropagation()}>{p.title}{p.firstName} {p.lastName}</Link>
                        {p.reasons.length > 0 && <div className="muted" style={{ fontSize: '0.85rem', fontWeight: 400 }}>{p.reasons.join(', ')}</div>}
                      </td>
                      <td data-label="HN">{p.hn}</td>
                      <td data-label="อายุ">{p.age}</td>
                      <td data-label="ระยะ"><Stage stage={p.stage} /></td>
                      <td data-label="GFR ล่าสุด" className="num">{p.latestGfr ? num(p.latestGfr.value, 1) : '–'}</td>
                      <td data-label="เปลี่ยนแปลง" className={`num ${p.gfrChangePct !== null && p.gfrChangePct <= -10 ? 'down' : ''}`}>{pct(p.gfrChangePct)}</td>
                      <td data-label="นัดครั้งต่อไป">
                        {thDate(p.nextAppointment)}
                        {p.appointment === 'missed' && <div className="down" style={{ fontSize: '0.85rem' }}>เลยนัด</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
              <span className="muted">ทั้งหมด {data.total} คน</span>
              <div className="row">
                <button className="btn secondary small" disabled={page <= 1} onClick={() => set('page', String(page - 1))}>ก่อนหน้า</button>
                <span>หน้า {page} / {pages}</span>
                <button className="btn secondary small" disabled={page >= pages} onClick={() => set('page', String(page + 1))}>ถัดไป</button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
