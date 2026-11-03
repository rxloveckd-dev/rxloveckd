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

/** Validates a sign-in name/password pair; returns a Thai error or ''. */
function checkCredentials(username: string, password: string): string {
  if (!password) return '';
  if (password.length < 6) return 'รหัสผ่านต้องมีอย่างน้อย 6 ตัว';
  if (GAS_MODE && !USERNAME_RE.test(username.trim().toLowerCase())) return 'ชื่อผู้ใช้ใช้ได้เฉพาะ a-z 0-9 . _ - ยาว 3–30 ตัว';
  return '';
}

/** Suggests a sign-in name from the email: "Somsri.K@gmail.com" → "somsri.k". */
const usernameFromEmail = (email: string) =>
  (email.split('@')[0] ?? '').toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 30);

const ROLES: Role[] = ['pharmacist', 'supervisor', 'admin'];
const ROLE_HELP: Record<Role, string> = {
  pharmacist: 'บันทึกและดูข้อมูลผู้ป่วย',
  supervisor: 'เหมือนเภสัชกร และจัดการผู้ใช้ได้',
  admin: 'เข้าระบบได้ แต่ดูข้อมูลผู้ป่วยไม่ได้',
};

const message = (err: unknown) => (err instanceof ApiError ? err.message : 'บันทึกไม่สำเร็จ กรุณาลองใหม่');

function PasswordInput({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
      <input
        id={id}
        type={show ? 'text' : 'password'}
        autoComplete="new-password"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{ flex: 1, minWidth: 0 }}
      />
      <button type="button" className="btn secondary small" onClick={() => setShow(!show)}>{show ? 'ซ่อน' : 'แสดง'}</button>
    </div>
  );
}

function RolePicker({ name, value, onChange, disabled }: { name: string; value: Role; onChange: (r: Role) => void; disabled?: boolean }) {
  return (
    <>
      <div className="choice" role="radiogroup">
        {ROLES.map((r) => (
          <label key={r}>
            <input type="radio" name={name} value={r} checked={value === r} disabled={disabled} onChange={() => onChange(r)} />
            {LABELS.role[r]}
          </label>
        ))}
      </div>
      <span className="muted" style={{ fontSize: '0.85rem' }}>{disabled ? 'เปลี่ยนสิทธิ์ของตัวเองไม่ได้' : ROLE_HELP[value]}</span>
    </>
  );
}

function useSaveUser(onSaved: (note: string) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (u: ManagedUser) => api<{ users: ManagedUser[]; note: string }>('/admin/users', { method: 'POST', json: u }),
    onSuccess: (res) => {
      qc.setQueryData(['admin-users'], { users: [...res.users] });
      onSaved(res.note);
    },
  });
}

function AddUser({ onSaved }: { onSaved: (note: string) => void }) {
  const blank = { name: '', email: '', username: '', password: '', role: 'pharmacist' as Role };
  const [f, setF] = useState(blank);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [error, setError] = useState('');
  const [added, setAdded] = useState('');
  const save = useSaveUser(onSaved);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setAdded('');
    if (!f.name.trim()) return setError('กรุณากรอกชื่อ-นามสกุล');
    if (!f.email.trim()) return setError(GAS_MODE ? 'กรุณากรอกอีเมล Google' : 'กรุณากรอกชื่อผู้ใช้');
    const problem = checkCredentials(f.username, f.password);
    if (problem) return setError(problem);
    try {
      await save.mutateAsync({
        email: f.email,
        displayName: f.name,
        role: f.role,
        active: true,
        username: GAS_MODE ? f.username : undefined,
        password: f.password,
      });
      setAdded(`เพิ่ม ${f.name.trim()} แล้ว`);
      setF(blank);
      setUsernameTouched(false);
    } catch (err) {
      setError(message(err));
    }
  }

  return (
    <Section title="เพิ่มผู้ใช้">
      <form onSubmit={submit} noValidate>
        <div className="grid-2">
          <Field label="ชื่อ-นามสกุล" htmlFor="un">
            <input id="un" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="ภก./ภญ. ชื่อ นามสกุล" />
          </Field>
          <Field label={GAS_MODE ? 'อีเมล Google' : 'ชื่อผู้ใช้'} htmlFor="ue">
            <input
              id="ue"
              type={GAS_MODE ? 'email' : 'text'}
              value={f.email}
              placeholder={GAS_MODE ? 'name@gmail.com' : 'pharm3'}
              onChange={(e) => {
                const email = e.target.value;
                setF({ ...f, email, username: GAS_MODE && !usernameTouched ? usernameFromEmail(email) : f.username });
              }}
            />
          </Field>
          {GAS_MODE && (
            <Field label="ชื่อผู้ใช้สำหรับเข้าระบบ" htmlFor="ulog">
              <input
                id="ulog"
                autoComplete="off"
                value={f.username}
                placeholder="ตั้งให้อัตโนมัติจากอีเมล"
                onChange={(e) => {
                  setUsernameTouched(true);
                  setF({ ...f, username: e.target.value });
                }}
              />
            </Field>
          )}
          <Field label="รหัสผ่าน (อย่างน้อย 6 ตัว)" htmlFor="upw">
            <PasswordInput id="upw" value={f.password} onChange={(password) => setF({ ...f, password })} />
          </Field>
          <Field label="สิทธิ์">
            <RolePicker name="new-role" value={f.role} onChange={(role) => setF({ ...f, role })} />
          </Field>
        </div>
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn" disabled={save.isPending}>{save.isPending ? 'กำลังบันทึก…' : 'เพิ่มผู้ใช้'}</button>
          {error && <span className="down">{error}</span>}
          {added && <span className="up">{added}</span>}
        </div>
        {GAS_MODE && (
          <p className="muted" style={{ margin: '10px 0 0', fontSize: '0.9rem' }}>
            ระบบจะแชร์ Sheet ให้อีเมลนี้อัตโนมัติ ผู้ใช้เข้าด้วยบัญชี Google ของตัวเอง แล้วใส่ชื่อผู้ใช้และรหัสผ่านที่ตั้งไว้ที่นี่
            (ถ้าไม่ตั้งรหัสผ่าน จะใช้ชื่อผู้ใช้และรหัสผ่านของคลินิกแทน)
          </p>
        )}
      </form>
    </Section>
  );
}

function EditUser({ u, self, onSaved, onClose }: { u: ManagedUser; self: boolean; onSaved: (note: string) => void; onClose: () => void }) {
  const [f, setF] = useState({
    name: u.displayName,
    role: u.role,
    username: u.username || (GAS_MODE ? usernameFromEmail(u.email) : ''),
    password: '',
  });
  const [error, setError] = useState('');
  const save = useSaveUser(onSaved);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!f.name.trim()) return setError('กรุณากรอกชื่อ-นามสกุล');
    const problem = checkCredentials(f.username, f.password);
    if (problem) return setError(problem);
    try {
      await save.mutateAsync({ ...u, displayName: f.name, role: f.role, username: GAS_MODE ? f.username : u.username, password: f.password });
      onClose();
    } catch (err) {
      setError(message(err));
    }
  }

  return (
    <form onSubmit={submit} noValidate style={{ marginTop: 10, fontWeight: 400 }}>
      <div className="grid-2">
        <Field label="ชื่อ-นามสกุล" htmlFor={`en-${u.email}`}>
          <input id={`en-${u.email}`} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        {GAS_MODE && (
          <Field label="ชื่อผู้ใช้สำหรับเข้าระบบ" htmlFor={`eu-${u.email}`}>
            <input id={`eu-${u.email}`} autoComplete="off" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
          </Field>
        )}
        <Field label="รหัสผ่านใหม่" htmlFor={`ep-${u.email}`}>
          <PasswordInput id={`ep-${u.email}`} value={f.password} onChange={(password) => setF({ ...f, password })} placeholder="เว้นว่างถ้าไม่เปลี่ยน" />
        </Field>
        <Field label="สิทธิ์">
          <RolePicker name={`role-${u.email}`} value={f.role} disabled={self} onChange={(role) => setF({ ...f, role })} />
        </Field>
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn small" disabled={save.isPending}>{save.isPending ? 'กำลังบันทึก…' : 'บันทึกการแก้ไข'}</button>
        <button type="button" className="btn secondary small" onClick={onClose}>ยกเลิก</button>
        {error && <span className="down">{error}</span>}
      </div>
    </form>
  );
}

function UserRow({ u, self, onSaved }: { u: ManagedUser; self: boolean; onSaved: (note: string) => void }) {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const save = useSaveUser(onSaved);
  const remove = useMutation({
    mutationFn: () => api<{ users: ManagedUser[]; note: string }>('/admin/users/delete', { method: 'POST', json: { email: u.email } }),
    onSuccess: (res) => {
      qc.setQueryData(['admin-users'], { users: [...res.users] });
      onSaved(res.note);
    },
    onError: (err) => setError(message(err)),
  });

  return (
    <tr style={u.active ? undefined : { color: 'var(--ink-soft)' }}>
      <td className="lead" colSpan={editing ? 4 : 1}>
        {u.displayName}
        {self && <span className="muted"> (คุณ)</span>}
        <div className="muted" style={{ fontSize: '0.85rem', fontWeight: 400, wordBreak: 'break-all' }}>{u.email}</div>
        {GAS_MODE && (
          <div style={{ fontSize: '0.85rem', fontWeight: 400 }}>
            {u.hasPassword ? <>เข้าระบบด้วย <b>{u.username}</b></> : <span className="muted">ใช้ชื่อผู้ใช้และรหัสผ่านของคลินิก</span>}
          </div>
        )}
        {editing && <EditUser u={u} self={self} onSaved={onSaved} onClose={() => setEditing(false)} />}
        {error && <div className="down" style={{ fontSize: '0.85rem' }}>{error}</div>}
      </td>
      {!editing && (
        <>
          <td data-label="สิทธิ์">{LABELS.role[u.role]}</td>
          <td data-label="สถานะ">{u.active ? <span className="up">ใช้งานได้</span> : 'ระงับแล้ว'}</td>
          <td data-label="">
            <span className="row-actions">
              <button
                className="btn secondary small"
                onClick={() => {
                  setError('');
                  setEditing(true);
                }}
              >
                แก้ไข
              </button>
              {!self && (
                <button
                  className="btn secondary small"
                  disabled={save.isPending}
                  onClick={() => {
                    if (!u.active || window.confirm(`ระงับการใช้งานของ ${u.displayName}?`)) {
                      setError('');
                      save.mutate({ ...u, active: !u.active }, { onError: (err) => setError(message(err)) });
                    }
                  }}
                >
                  {u.active ? 'ระงับการใช้งาน' : 'เปิดใช้งานอีกครั้ง'}
                </button>
              )}
              {!self && (
                <button
                  className="btn secondary small danger"
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
            </span>
          </td>
        </>
      )}
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
          <p className="muted" style={{ margin: 0 }}>เพิ่มเจ้าหน้าที่ แล้วกด "แก้ไข" เพื่อเปลี่ยนชื่อ สิทธิ์ หรือรหัสผ่าน การเปลี่ยนแปลงทุกครั้งถูกบันทึกไว้</p>
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
