import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LABELS } from '@rx/shared';
import { api, ApiError, GAS_MODE, STATIC_DEMO, useMe } from './api';
import { Loading } from './components/ui';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Patients } from './pages/Patients';
import { PatientNew } from './pages/PatientNew';
import { PatientProfile } from './pages/PatientProfile';
import { VisitNew } from './pages/VisitNew';
import { Reports } from './pages/Reports';
import { Users } from './pages/Users';

function KidneyMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 40 40" aria-hidden="true">
      <path d="M17 6c-7 0-12 6-12 14s5 14 12 14c4 0 6-3 6-6 0-2-2-3-2-5s2-3 2-5V12c0-4-2-6-6-6z" fill="#c8505a" />
      <path d="M24 9c5 1 10 5 10 11s-5 10-10 11" fill="none" stroke="#ffe27a" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Apps Script mode: the Google account is signed in but not allowed, or the Sheet is not shared. */
function NoAccess({ error }: { error: unknown }) {
  return (
    <main className="login-panel" style={{ minHeight: '100vh' }}>
      <div className="login-form">
        <h2>ยังเข้าใช้งานไม่ได้</h2>
        <div className="alert" role="alert">
          {error instanceof ApiError ? error.message : 'เชื่อมต่อระบบไม่สำเร็จ'}
        </div>
        <p className="muted" style={{ margin: 0 }}>
          ระบบนี้ใช้ได้เฉพาะบัญชี Google ของเจ้าหน้าที่คลินิกรักษ์ไตที่ได้รับสิทธิ์แล้ว
          ถ้าเพิ่งได้รับสิทธิ์ ให้ปิดแล้วเปิดหน้านี้ใหม่
        </p>
      </div>
    </main>
  );
}

export function App() {
  const me = useMe();
  const qc = useQueryClient();

  if (me.isLoading) return <Loading />;
  if (GAS_MODE && (me.isError || !me.data)) return <NoAccess error={me.error} />;
  if (me.isError || !me.data) return <Login />;
  if (GAS_MODE && !me.data.signedIn) {
    // Google account is allowed; now the clinic username/password (set once by a supervisor).
    const setup = !me.data.loginConfigured;
    if (setup && me.data.user.role !== 'supervisor') {
      return <NoAccess error={new ApiError(403, 'ยังไม่ได้ตั้งรหัสผ่านเข้าระบบ กรุณาให้หัวหน้าเภสัชกรเปิดระบบครั้งแรก')} />;
    }
    return <Login setup={setup} />;
  }

  const { user, demoMode } = me.data;
  const clinical = user.role !== 'admin';
  // User management exists where accounts live in the browser layer (Apps Script or demo).
  const canManageUsers = user.role === 'supervisor' && (GAS_MODE || STATIC_DEMO);

  async function logout() {
    await api('/auth/logout', { method: 'POST' });
    // Drop patient data from memory, then mark the user as signed out so <App> shows the login page.
    // (qc.clear() alone leaves mounted queries showing their last result.)
    qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
    if (GAS_MODE) await qc.invalidateQueries({ queryKey: ['me'] }); // still the same Google account, now signed out
    else qc.setQueryData(['me'], null);
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
            {canManageUsers && <NavLink to="/users">จัดการผู้ใช้</NavLink>}
          </>
        )}
        <div className="side-foot">
          <span className="who">
            {user.displayName}
            <br />
            {LABELS.role[user.role]}
            <br />
          </span>
          {GAS_MODE && <small style={{ wordBreak: 'break-all', display: 'block' }}>{user.username}</small>}
          <button className="btn secondary small" onClick={logout}>ออกจากระบบ</button>
        </div>
      </nav>
      <div>
        {/* Server dev/demo only; the public static demo shows no banner (clinic request). */}
        {demoMode && !STATIC_DEMO && (
          <div className="demo-bar">โหมดทดลอง: ข้อมูลผู้ป่วยทั้งหมดเป็นข้อมูลสมมติ ห้ามบันทึกข้อมูลผู้ป่วยจริง</div>
        )}
        <main className="main">
          {clinical ? (
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/patients" element={<Patients />} />
              <Route path="/patients/new" element={<PatientNew />} />
              <Route path="/patients/:id" element={<PatientProfile />} />
              <Route path="/patients/:id/visits/new" element={<VisitNew />} />
              <Route path="/reports" element={<Reports />} />
              {canManageUsers && <Route path="/users" element={<Users />} />}
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
