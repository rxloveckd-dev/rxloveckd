import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../api';
import { Field } from '../components/ui';
import { Icon } from '../components/Icon';
import { BUILD_LABEL, VERSION_LABEL } from '../version';

/**
 * Two smiling kidneys on a soft stage, with a heartbeat line, a pill, a water drop, a leaf and
 * sparkles floating around them. Motion is gentle and switches off for reduced-motion users.
 */
function KidneyIllustration() {
  return (
    <svg className="login-art" viewBox="0 0 360 260" aria-hidden="true">
      <defs>
        <radialGradient id="la-glow" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#ffe27a" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#ffe27a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="la-kidney" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f08990" />
          <stop offset="100%" stopColor="#d4545e" />
        </linearGradient>
      </defs>

      <circle cx="180" cy="122" r="118" fill="url(#la-glow)" />
      <circle className="la-ring" cx="180" cy="122" r="92" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2" strokeDasharray="4 10" />
      <ellipse cx="180" cy="214" rx="96" ry="10" fill="rgba(0,0,0,0.18)" />

      {/* left kidney */}
      <g className="la-bob">
        <path d="M148 64c-28 0-48 26-48 60s20 60 48 60c15 0 24-11 24-23 0-9-8-13-8-22s8-13 8-22V87c0-14-9-23-24-23z" fill="url(#la-kidney)" />
        <path d="M130 94c-9 9-11 22-9 33" stroke="#ffd0d4" strokeWidth="6" strokeLinecap="round" fill="none" />
        <g className="la-blink">
          <circle cx="138" cy="124" r="4" fill="#1f2a44" />
          <circle cx="156" cy="124" r="4" fill="#1f2a44" />
        </g>
        <circle cx="130" cy="136" r="5" fill="#ffb3ba" opacity="0.8" />
        <path d="M140 137q7 6 14 0" stroke="#1f2a44" strokeWidth="3" strokeLinecap="round" fill="none" />
      </g>

      {/* right kidney */}
      <g className="la-bob la-late">
        <path d="M212 64c28 0 48 26 48 60s-20 60-48 60c-15 0-24-11-24-23 0-9 8-13 8-22s-8-13-8-22V87c0-14 9-23 24-23z" fill="url(#la-kidney)" />
        <path d="M230 94c9 9 11 22 9 33" stroke="#ffd0d4" strokeWidth="6" strokeLinecap="round" fill="none" />
        <g className="la-blink la-late">
          <circle cx="204" cy="124" r="4" fill="#1f2a44" />
          <circle cx="222" cy="124" r="4" fill="#1f2a44" />
        </g>
        <circle cx="230" cy="136" r="5" fill="#ffb3ba" opacity="0.8" />
        <path d="M206 137q7 6 14 0" stroke="#1f2a44" strokeWidth="3" strokeLinecap="round" fill="none" />
      </g>

      {/* heart between them */}
      <path className="la-beat" d="M180 100c-4-7-14-6-14 2 0 7 14 14 14 14s14-7 14-14c0-8-10-9-14-2z" fill="#ffe27a" />

      {/* heartbeat line */}
      <path className="la-pulse" d="M14 238h96l12-24 14 40 12-32 10 16h188" stroke="#ffe27a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      {/* floating friends: pill, water drop, leaf, sparkles */}
      <g className="la-float" style={{ animationDelay: '-1s' }}>
        <g transform="rotate(-30 304 54)">
          <rect x="280" y="43" width="48" height="22" rx="11" fill="#fff" />
          <rect x="304" y="43" width="24" height="22" rx="11" fill="#8bc34a" />
          <rect x="304" y="43" width="12" height="22" fill="#8bc34a" />
        </g>
      </g>
      <g className="la-float" style={{ animationDelay: '-2.5s' }}>
        <path d="M54 46c0 0-16 18-16 28a16 16 0 0 0 32 0c0-10-16-28-16-28z" fill="#7cc4ff" />
        <ellipse cx="48" cy="76" rx="4" ry="6" fill="#fff" opacity="0.6" />
      </g>
      <g className="la-float" style={{ animationDelay: '-4s' }}>
        <path d="M318 168c-22 0-30 16-30 30 14 0 30-8 30-30z" fill="#8bd88b" />
        <path d="M290 196c8-8 16-14 24-22" stroke="#4f9e4f" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </g>
      <path className="la-twinkle" d="M70 160l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#ffe27a" />
      <path className="la-twinkle" style={{ animationDelay: '-1.2s' }} d="M290 108l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#fff" />
      <path className="la-twinkle" style={{ animationDelay: '-2.1s' }} d="M98 30l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#ffb3ba" />
    </svg>
  );
}

const FEATURES = [
  ['clipboard', 'yellow', 'บันทึกการติดตามแทนฟอร์มกระดาษ', 'ผลแล็บ ยา และคำแนะนำ รวมไว้ในที่เดียว'],
  ['heart', 'pink', 'เห็นผู้ป่วยที่ต้องติดตามด่วน', 'แยกสีตามระยะโรคและความเร่งด่วน'],
  ['chart', 'lilac', 'สรุปรายเดือนอัตโนมัติ', 'ดาวน์โหลดเป็น Excel ได้ทันที'],
] as const;

const STAGE_STRIP = [
  ['1', '#1b7f3b'],
  ['2', '#8bc34a'],
  ['3', '#f6c026'],
  ['4', '#f08a24'],
  ['5', '#d32f2f'],
] as const;

/** setup: first run in Apps Script mode, a supervisor chooses the clinic username/password. */
export function Login({ setup = false }: { setup?: boolean }) {
  const qc = useQueryClient();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (setup && password !== confirm) {
      setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
      return;
    }
    setBusy(true);
    try {
      await api(setup ? '/auth/setup' : '/auth/login', { method: 'POST', json: { username, password } });
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
          {FEATURES.map(([icon, tone, title, detail]) => (
            <li key={title}>
              <span className={`feature-ic ${tone}`} aria-hidden="true"><Icon name={icon} size="20px" /></span>
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
          <span className="login-hello" aria-hidden="true">
            <Icon name="heart" size="16px" /> {setup ? 'เริ่มต้นใช้งาน' : 'ยินดีต้อนรับ'}
          </span>
          <h2>{setup ? 'ตั้งชื่อผู้ใช้และรหัสผ่าน' : 'เข้าสู่ระบบ'}</h2>
          <p className="muted" style={{ margin: '-6px 0 6px' }}>
            {setup
              ? 'ครั้งแรกเท่านั้น: กำหนดชื่อผู้ใช้และรหัสผ่านที่เจ้าหน้าที่คลินิกจะใช้เข้าระบบ'
              : 'สำหรับเภสัชกรและเจ้าหน้าที่คลินิก'}
          </p>
          <Field label="ชื่อผู้ใช้" htmlFor="u">
            <div className="with-ic">
              <Icon name="users" />
              <input id="u" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
            </div>
          </Field>
          <Field label="รหัสผ่าน" htmlFor="p">
            <div className="password with-ic">
              <Icon name="key" />
              <input
                id="p"
                type={show ? 'text' : 'password'}
                autoComplete={setup ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="button" className="reveal" onClick={() => setShow((s) => !s)} aria-pressed={show}>
                <Icon name={show ? 'eyeOff' : 'eye'} />
                {show ? 'ซ่อน' : 'แสดง'}
              </button>
            </div>
          </Field>
          {setup && (
            <Field label="ยืนยันรหัสผ่าน" htmlFor="p2">
              <input id="p2" type={show ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </Field>
          )}
          {error && <div className="alert" role="alert">{error}</div>}
          <button className="btn login-submit" disabled={busy || !username || !password}>
            <Icon name="login" />
            {busy ? 'กำลังบันทึก…' : setup ? 'บันทึกและเข้าสู่ระบบ' : 'เข้าสู่ระบบ'}
          </button>
          <p className="app-version">
            {VERSION_LABEL}
            <span>{BUILD_LABEL}</span>
          </p>
        </form>
      </section>
    </main>
  );
}
