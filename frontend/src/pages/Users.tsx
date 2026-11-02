import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LABELS, type Role } from '@rx/shared';
import { api, ApiError, GAS_MODE, useMe } from '../api';
import { Empty, ErrorState, Field, Loading, Section } from '../components/ui';

interface ManagedUser {
  email: string;
  displayName: string;
  role: Role;
  active: boolean;
  /** Personal sign-in name; empty means the person uses the shared clinic login. */
  username?: string;
  hasPassword?: boolean;
  /** Only sent when setting a new password; never returned. */
  password?: string;
}

const USERNAME_RE = /^[a-z0-9._-]{3,30}$/;

/** Validates a new personal username/password pair; returns a Thai error or ''. */
function checkCredentials(username: string, password: string, confirm: string): string {
  if (!password) return '';
  if (!USERNAME_RE.test(username.trim().toLowerCase())) return 'ชื่อผู้ใช้ใช้ได้เฉพาะ a-z 0-9 . _ - ยาว 3–30 ตัว';
  if (password.length < 6) return 'รหัสผ่านต้องมีอย่างน้อย 6 ตัว';
  if (password !== confirm) return 'รหัสผ่านทั้งสองช่องไม่ตรงกัน';
  return '';
}

const ROLES: Role[] = ['pharmacist', 'supervisor', 'admin'];
const ROLE_HELP: Record<Role, string> = {
  pharmacist: 'บันทึกและดูข้อมูลผู้ป่วย',
  supervisor: 'เหมือนเภสัชกร และจัดการผู้ใช้ได้',
  admin: 'เข้าระบบได้ แต่ดูข้อมูลผู้ป่วยไม่ได้',
};

const message = (err: unknown) => (err instanceof ApiError ? err.message : 'บันทึกไม่สำเร็จ กรุณาลองใหม่');

function AddUser({ onSaved }: { onSaved: (note: string) => void }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('pharmacist');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const save = useMutation({
    mutationFn: (u: ManagedUser) => api<{ users: ManagedUser[]; note: string }>('/admin/users', { method: 'POST', json: u }),
    onSuccess: (res) => {
      qc.setQueryData(['admin-users'], { users: [...res.users] });
      onSaved(res.note);
    },
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const problem = checkCredentials(username, password, confirm);
    if (problem) {
      setError(problem);
      return;
    }
    try {
      await save.mutateAsync({ email, displayName: name, role, active: true, username, password });
      setEmail('');
      setName('');
      setRole('pharmacist');
      setUsername('');
      setPassword('');
      setConfirm('');
    } catch (err) {
      setError(message(err));
    }
  }

  return (
    <Section title="เพิ่มผู้ใช้">
      <form onSubmit={submit} className="grid-3">
        <Field label={GAS_MODE ? 'อีเมล Google ของผู้ใช้' : 'ชื่อผู้ใช้'} htmlFor="ue">
          <input id="ue" type={GAS_MODE ? 'email' : 'text'} value={email} onChange={(e) => setEmail(e.target.value)} placeholder={GAS_MODE ? 'name@gmail.com' : 'pharm3'} />
        </Field>
        <Field label="ชื่อที่แสดง" htmlFor="un">
          <input id="un" value={name} onChange={(e) => setName(e.target.value)} placeholder="ภก./ภญ. ชื่อ นามสกุล" />
        </Field>
        <Field label="สิทธิ์" htmlFor="ur">
          <select id="ur" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => <option key={r} value={r}>{LABELS.role[r]}</option>)}
          </select>
          <span className="muted" style={{ fontSize: '0.85rem' }}>{ROLE_HELP[role]}</span>
        </Field>
        <Field label="ชื่อผู้ใช้สำหรับเข้าระบบ" htmlFor="ulog">
          <input id="ulog" autoComplete="off" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="เช่น pharm.somsri" />
        </Field>
        <Field label="รหัสผ่าน (อย่างน้อย 6 ตัว)" htmlFor="upw">
          <input id="upw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="ยืนยันรหัสผ่าน" htmlFor="upw2">
          <input id="upw2" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <div className="row" style={{ gridColumn: '1 / -1' }}>
          <button className="btn" disabled={save.isPending || !email}>{save.isPending ? 'กำลังบันทึก…' : 'เพิ่มผู้ใช้'}</button>
          {error && <span className="down">{error}</span>}
        </div>
        {GAS_MODE && (
          <p className="muted" style={{ gridColumn: '1 / -1', margin: 0, fontSize: '0.9rem' }}>
            ระบบจะแชร์ Sheet ให้อีเมลนี้เป็นผู้แก้ไขให้อัตโนมัติ ผู้ใช้เข้าด้วยบัญชี Google ของตัวเอง แล้วใส่ชื่อผู้ใช้และรหัสผ่านที่ตั้งไว้ที่นี่
            (ถ้าเว้นว่าง จะใช้ชื่อผู้ใช้และรหัสผ่านของคลินิกแทน)
          </p>
        )}
      </form>
    </Section>
  );
}

function UserRow({ u, self, onSaved }: { u: ManagedUser; self: boolean; onSaved: (note: string) => void }) {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const save = useMutation({
    mutationFn: (next: ManagedUser) => api<{ users: ManagedUser[]; note: string }>('/admin/users', { method: 'POST', json: next }),
    onSuccess: (res) => {
      qc.setQueryData(['admin-users'], { users: [...res.users] });
      onSaved(res.note);
    },
    onError: (err) => setError(message(err)),
  });
  const update = (patch: Partial<ManagedUser>) => {
    setError('');
    save.mutate({ ...u, ...patch });
  };
  const remove = useMutation({
    mutationFn: () => api<{ users: ManagedUser[]; note: string }>('/admin/users/delete', { method: 'POST', json: { email: u.email } }),
    onSuccess: (res) => {
      qc.setQueryData(['admin-users'], { users: [...res.users] });
      onSaved(res.note);
    },
    onError: (err) => setError(message(err)),
  });
  const [setting, setSetting] = useState(false);
  const [login, setLogin] = useState({ username: u.username ?? '', password: '', confirm: '' });

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    setError('');
    const problem = login.password ? checkCredentials(login.username, login.password, login.confirm) : 'กรุณาใส่รหัสผ่านใหม่';
    if (problem) {
      setError(problem);
      return;
    }
    try {
      await save.mutateAsync({ ...u, username: login.username, password: login.password });
      setSetting(false);
      setLogin({ username: login.username, password: '', confirm: '' });
    } catch {
      /* message shown by onError */
    }
  }

  return (
    <tr style={u.active ? undefined : { color: 'var(--ink-soft)' }}>
      <td className="lead">
        {u.displayName}
        {self && <span className="muted"> (คุณ)</span>}
        <div className="muted" style={{ fontSize: '0.85rem', fontWeight: 400, wordBreak: 'break-all' }}>{u.email}</div>
        <div style={{ fontSize: '0.85rem', fontWeight: 400 }}>
          {u.hasPassword ? (
            <>เข้าระบบด้วย <b>{u.username}</b> และรหัสผ่านของตัวเอง</>
          ) : (
            <span className="muted">ใช้ชื่อผู้ใช้และรหัสผ่านของคลินิก</span>
          )}
        </div>
        {setting && (
          <form onSubmit={savePassword} className="row" style={{ marginTop: 8, alignItems: 'flex-end' }}>
            <Field label="ชื่อผู้ใช้" htmlFor={`lu-${u.email}`}>
              <input id={`lu-${u.email}`} autoComplete="off" value={login.username} onChange={(e) => setLogin({ ...login, username: e.target.value })} />
            </Field>
            <Field label="รหัสผ่านใหม่" htmlFor={`lp-${u.email}`}>
              <input id={`lp-${u.email}`} type="password" autoComplete="new-password" value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} />
            </Field>
            <Field label="ยืนยันรหัสผ่าน" htmlFor={`lc-${u.email}`}>
              <input id={`lc-${u.email}`} type="password" autoComplete="new-password" value={login.confirm} onChange={(e) => setLogin({ ...login, confirm: e.target.value })} />
            </Field>
            <button className="btn small" disabled={save.isPending}>บันทึกรหัสผ่าน</button>
            <button type="button" className="btn secondary small" onClick={() => setSetting(false)}>ยกเลิก</button>
          </form>
        )}
        {error && <div className="down" style={{ fontSize: '0.85rem' }}>{error}</div>}
      </td>
      <td data-label="สิทธิ์">
        <select
          aria-label={`สิทธิ์ของ ${u.displayName}`}
          value={u.role}
          disabled={self || save.isPending}
          onChange={(e) => update({ role: e.target.value as Role })}
          style={{ font: 'inherit', padding: 6 }}
        >
          {ROLES.map((r) => <option key={r} value={r}>{LABELS.role[r]}</option>)}
        </select>
      </td>
      <td data-label="สถานะ">{u.active ? <span className="up">ใช้งานได้</span> : 'ระงับแล้ว'}</td>
      <td data-label="">
        {!setting && (
          <button className="btn secondary small" style={{ marginRight: 6 }} onClick={() => setSetting(true)}>
            {u.hasPassword ? 'เปลี่ยนรหัสผ่าน' : 'ตั้งรหัสผ่าน'}
          </button>
        )}
        {!self && (
          <button
            className="btn secondary small"
            disabled={save.isPending}
            onClick={() => {
              if (!u.active || window.confirm(`ระงับการใช้งานของ ${u.displayName}?`)) update({ active: !u.active });
            }}
          >
            {u.active ? 'ระงับการใช้งาน' : 'เปิดใช้งานอีกครั้ง'}
          </button>
        )}
        {!self && (
          <button
            className="btn secondary small danger"
            style={{ marginLeft: 6 }}
            disabled={remove.isPending}
            onClick={() => {
              if (window.confirm(`ลบผู้ใช้ ${u.displayName} (${u.email})?\nคนนี้จะเข้าระบบไม่ได้อีก ข้อมูลที่เคยบันทึกไว้ยังอยู่ครบ`)) {
                setError('');
                remove.mutate();
              }
            }}
          >
            {remove.isPending ? 'กำลังลบ…' : 'ลบ'}
          </button>
        )}
      </td>
    </tr>
  );
}

function ChangePassword() {
  const [form, setForm] = useState({ currentUsername: '', currentPassword: '', newUsername: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const change = useMutation({
    mutationFn: (b: typeof form) => api('/auth/change', { method: 'POST', json: b }),
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setDone(false);
    if (form.newPassword !== form.confirm) {
      setError('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน');
      return;
    }
    try {
      await change.mutateAsync(form);
      setDone(true);
      setForm({ currentUsername: '', currentPassword: '', newUsername: '', newPassword: '', confirm: '' });
    } catch (err) {
      setError(message(err));
    }
  }

  return (
    <Section title="เปลี่ยนชื่อผู้ใช้และรหัสผ่านของคลินิก">
      <form onSubmit={submit} className="grid-3">
        <Field label="ชื่อผู้ใช้ปัจจุบัน" htmlFor="cu"><input id="cu" autoComplete="username" value={form.currentUsername} onChange={set('currentUsername')} /></Field>
        <Field label="รหัสผ่านปัจจุบัน" htmlFor="cp"><input id="cp" type="password" autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} /></Field>
        <span />
        <Field label="ชื่อผู้ใช้ใหม่" htmlFor="nu"><input id="nu" autoComplete="off" value={form.newUsername} onChange={set('newUsername')} /></Field>
        <Field label="รหัสผ่านใหม่" htmlFor="np"><input id="np" type="password" autoComplete="new-password" value={form.newPassword} onChange={set('newPassword')} /></Field>
        <Field label="ยืนยันรหัสผ่านใหม่" htmlFor="nc"><input id="nc" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} /></Field>
        <div className="row" style={{ gridColumn: '1 / -1' }}>
          <button className="btn" disabled={change.isPending}>{change.isPending ? 'กำลังบันทึก…' : 'เปลี่ยนรหัสผ่าน'}</button>
          {error && <span className="down">{error}</span>}
          {done && <span className="up">เปลี่ยนแล้ว แจ้งชื่อผู้ใช้และรหัสผ่านใหม่ให้ทีม</span>}
        </div>
      </form>
    </Section>
  );
}

export function Users() {
  const me = useMe();
  const [note, setNote] = useState('');
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api<{ users: ManagedUser[] }>('/admin/users'),
  });
  const selfId = me.data?.user.username.toLowerCase();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>จัดการผู้ใช้</h1>
          <p className="muted" style={{ margin: 0 }}>เพิ่มเจ้าหน้าที่ กำหนดสิทธิ์ และระงับการใช้งาน การเปลี่ยนแปลงทุกครั้งถูกบันทึกไว้</p>
        </div>
      </div>
      {note && <div className="alert" role="alert" style={{ marginTop: 14 }}>{note}</div>}
      <AddUser onSaved={setNote} />
      <Section title="ผู้ใช้ทั้งหมด">
        {isLoading ? (
          <Loading />
        ) : error || !data ? (
          <ErrorState error={error} />
        ) : data.users.length === 0 ? (
          <Empty>ยังไม่มีผู้ใช้</Empty>
        ) : (
          <div className="table-wrap">
            <table className="stack">
              <thead>
                <tr><th>ผู้ใช้</th><th>สิทธิ์</th><th>สถานะ</th><th /></tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <UserRow key={u.email} u={u} self={u.email === selfId} onSaved={setNote} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
      {GAS_MODE && <ChangePassword />}
    </>
  );
}
