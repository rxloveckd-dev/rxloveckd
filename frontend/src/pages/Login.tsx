import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../api';
import { Field } from '../components/ui';

/** Two kidneys with a pulse line and a pill, drawn in the clinic's colors. */
function KidneyIllustration() {
  return (
    <svg className="login-art" viewBox="0 0 320 220" aria-hidden="true">
      <circle cx="160" cy="110" r="96" fill="rgba(255,255,255,0.06)" />
      <circle cx="160" cy="110" r="70" fill="rgba(255,255,255,0.05)" />
      {/* left kidney */}
      <path
        d="M128 54c-26 0-44 24-44 56s18 56 44 56c14 0 22-10 22-21 0-8-7-12-7-20s7-12 7-20v-30c0-13-8-21-22-21z"
        fill="#e06b74"
      />
      <path d="M112 84c-8 8-10 20-8 30" stroke="#f6b9be" strokeWidth="6" strokeLinecap="round" fill="none" />
      {/* right kidney */}
      <path
        d="M192 54c26 0 44 24 44 56s-18 56-44 56c-14 0-22-10-22-21 0-8 7-12 7-20s-7-12-7-20v-30c0-13 8-21 22-21z"
        fill="#e06b74"
      />
      <path d="M208 84c8 8 10 20 8 30" stroke="#f6b9be" strokeWidth="6" strokeLinecap="round" fill="none" />
      {/* faces, like the clinic's paper form */}
      <circle cx="120" cy="112" r="3.5" fill="#1f2a44" />
      <circle cx="136" cy="112" r="3.5" fill="#1f2a44" />
      <path d="M121 124q7 6 14 0" stroke="#1f2a44" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="184" cy="112" r="3.5" fill="#1f2a44" />
      <circle cx="200" cy="112" r="3.5" fill="#1f2a44" />
      <path d="M185 124q7 6 14 0" stroke="#1f2a44" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* pulse line joining them */}
      <path
        d="M20 190h70l12-22 14 40 12-30 10 12h162"
        stroke="#ffe27a"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* pill */}
      <g transform="rotate(-30 262 52)">
        <rect x="238" y="40" width="48" height="22" rx="11" fill="#fff" />
        <rect x="262" y="40" width="24" height="22" rx="11" fill="#8bc34a" />
        <rect x="262" y="40" width="12" height="22" fill="#8bc34a" />
      </g>
      {/* plus sign */}
      <path d="M48 52v24M36 64h24" stroke="#ffe27a" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

const FEATURES = [
  ['บันทึกการติดตามแทนฟอร์มกระดาษ', 'ผลแล็บ ยา และคำแนะนำ รวมไว้ในที่เดียว'],
  ['เห็นผู้ป่วยที่ต้องติดตามด่วน', 'แยกสีตามระยะโรคและความเร่งด่วน'],
  ['สรุปรายเดือนอัตโนมัติ', 'ดาวน์โหลดเป็น Excel ได้ทันที'],
] as const;

const STAGE_STRIP = [
  ['1', '#1b7f3b'],
  ['2', '#8bc34a'],
  ['3', '#f6c026'],
  ['4', '#f08a24'],
  ['5', '#d32f2f'],
] as const;

export function Login() {
  const qc = useQueryClient();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
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
      setError(err instanceof ApiError ? err.message : 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-hero">
        <div className="login-brand">
          <b>Love CKD</b>
          <span>คลินิกรักษ์ไต โรงพยาบาลเขาชัยสน</span>
        </div>
        <KidneyIllustration />
        <h1 className="login-title">ดูแลไตไปด้วยกัน</h1>
        <p className="login-lead">ระบบบริบาลทางเภสัชกรรมสำหรับผู้ป่วยโรคไตเรื้อรัง</p>
        <ul className="login-features">
          {FEATURES.map(([title, detail]) => (
            <li key={title}>
              <span className="tick" aria-hidden="true">✓</span>
              <span>
                <b>{title}</b>
                <small>{detail}</small>
              </span>
            </li>
          ))}
        </ul>
        <div className="stage-strip" aria-label="สีระยะโรคไต 1 ถึง 5">
          {STAGE_STRIP.map(([n, c]) => (
            <span key={n} style={{ background: c }}>{n}</span>
          ))}
        </div>
      </section>

      <section className="login-panel">
        <form onSubmit={submit} className="login-form" noValidate>
          <h2>เข้าสู่ระบบ</h2>
          <p className="muted" style={{ margin: '-6px 0 6px' }}>สำหรับเภสัชกรและเจ้าหน้าที่คลินิก</p>
          <Field label="ชื่อผู้ใช้" htmlFor="u">
            <input id="u" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
          </Field>
          <Field label="รหัสผ่าน" htmlFor="p">
            <div className="password">
              <input
                id="p"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="button" className="reveal" onClick={() => setShow((s) => !s)} aria-pressed={show}>
                {show ? 'ซ่อน' : 'แสดง'}
              </button>
            </div>
          </Field>
          {error && <div className="alert" role="alert">{error}</div>}
          <button className="btn login-submit" disabled={busy || !username || !password}>
            {busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </section>
    </main>
  );
}
