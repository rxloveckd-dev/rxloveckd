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
    try {
      await save.mutateAsync({ email, displayName: name, role, active: true });
      setEmail('');
      setName('');
      setRole('pharmacist');
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
        <div className="row" style={{ gridColumn: '1 / -1' }}>
          <button className="btn" disabled={save.isPending || !email}>{save.isPending ? 'กำลังบันทึก…' : 'เพิ่มผู้ใช้'}</button>
          {error && <span className="down">{error}</span>}
        </div>
        {GAS_MODE && (
          <p className="muted" style={{ gridColumn: '1 / -1', margin: 0, fontSize: '0.9rem' }}>
            ระบบจะแชร์ Sheet ให้อีเมลนี้เป็นผู้แก้ไขให้อัตโนมัติ ผู้ใช้เข้าด้วยบัญชี Google ของตัวเอง แล้วใส่ชื่อผู้ใช้และรหัสผ่านของคลินิก
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

  return (
    <tr style={u.active ? undefined : { color: 'var(--ink-soft)' }}>
      <td className="lead">
        {u.displayName}
        {self && <span className="muted"> (คุณ)</span>}
        <div className="muted" style={{ fontSize: '0.85rem', fontWeight: 400, wordBreak: 'break-all' }}>{u.email}</div>
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
