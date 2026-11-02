import { useState, type FormEvent } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LABELS } from '@rx/shared';
import { api, ApiError, useMe } from './api';
import { Field, Loading } from './components/ui';
import { Dashboard } from './pages/Dashboard';
import { Patients } from './pages/Patients';
import { PatientNew } from './pages/PatientNew';
import { PatientProfile } from './pages/PatientProfile';
import { VisitNew } from './pages/VisitNew';
import { Reports } from './pages/Reports';

function KidneyMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 40 40" aria-hidden="true">
      <path d="M17 6c-7 0-12 6-12 14s5 14 12 14c4 0 6-3 6-6 0-2-2-3-2-5s2-3 2-5V12c0-4-2-6-6-6z" fill="#c8505a" />
      <path d="M24 9c5 1 10 5 10 11s-5 10-10 11" fill="none" stroke="#ffe27a" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function Login() {
  const qc = useQueryClient();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/auth/login', { method: 'POST', json: { username, password } });
      await qc.invalidateQueries({ queryKey: ['me'] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <form onSubmit={submit}>
        <div className="brand" style={{ padding: 0 }}>
          <KidneyMark />
          <div>
            <h1 style={{ fontSize: '1.4rem' }}>Love CKD</h1>
            <span className="muted">คลินิกรักษ์ไต รพ.เขาชัยสน</span>
          </div>
        </div>
        <Field label="ชื่อผู้ใช้" htmlFor="u">
          <input id="u" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </Field>
        <Field label="รหัสผ่าน" htmlFor="p">
          <input id="p" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {error && <div className="alert" role="alert">{error}</div>}
        <button className="btn" disabled={busy}>{busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}</button>
      </form>
    </main>
  );
}

export function App() {
  const me = useMe();
  const qc = useQueryClient();

  if (me.isLoading) return <Loading />;
  if (me.isError || !me.data) return <Login />;

  const { user, demoMode } = me.data;
  const clinical = user.role !== 'admin';

  async function logout() {
    await api('/auth/logout', { method: 'POST' });
    qc.clear();
    await qc.invalidateQueries({ queryKey: ['me'] });
  }

  return (
    <div className="shell">
      <nav className="side" aria-label="เมนูหลัก">
        <div className="brand">
          <KidneyMark />
          <div>
            <b>Love CKD</b>
            <small>คลินิกรักษ์ไต</small>
          </div>
        </div>
        {clinical && (
          <>
            <NavLink to="/" end>งานวันนี้</NavLink>
            <NavLink to="/patients">ผู้ป่วย</NavLink>
            <NavLink to="/patients/new">ลงทะเบียนผู้ป่วย</NavLink>
            <NavLink to="/reports">สรุปรายเดือน</NavLink>
          </>
        )}
        <div className="side-foot">
          <span className="who">
            {user.displayName}
            <br />
            {LABELS.role[user.role]}
            <br />
          </span>
          <button className="btn secondary small" onClick={logout}>ออกจากระบบ</button>
        </div>
      </nav>
      <div>
        {demoMode && <div className="demo-bar">โหมดทดลอง: ข้อมูลผู้ป่วยทั้งหมดเป็นข้อมูลสมมติ ห้ามบันทึกข้อมูลผู้ป่วยจริง</div>}
        <main className="main">
          {clinical ? (
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/patients" element={<Patients />} />
              <Route path="/patients/new" element={<PatientNew />} />
              <Route path="/patients/:id" element={<PatientProfile />} />
              <Route path="/patients/:id/visits/new" element={<VisitNew />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          ) : (
            <div className="section">
              <h2>บัญชีผู้ดูแลระบบ</h2>
              <p className="muted">บัญชีนี้ใช้จัดการระบบเท่านั้น ไม่สามารถดูข้อมูลผู้ป่วยได้</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
