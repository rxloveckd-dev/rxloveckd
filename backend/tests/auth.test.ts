import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config';
import { prisma } from '../src/db';
import { app, login, resetDb } from './helpers';

beforeEach(resetDb);

describe('auth', () => {
  it('rejects wrong passwords with a Thai message and audits the attempt', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'pharm', password: 'nope' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    expect(await prisma.auditLog.count({ where: { action: 'login', outcome: 'denied' } })).toBe(1);
  });

  it('sets an httpOnly session cookie and returns the user', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'pharm', password: 'pw' });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('pharmacist');
    expect(String(res.headers['set-cookie'])).toMatch(/HttpOnly/);
  });

  it('requires a session for patient data', async () => {
    expect((await request(app).get('/api/patients')).status).toBe(401);
  });

  it('denies patient data to admin on the server and audits it (FR-030)', async () => {
    const admin = await login('admin');
    expect((await admin.get('/api/patients')).status).toBe(403);
    expect((await admin.get('/api/dashboard')).status).toBe(403);
    expect(await prisma.auditLog.count({ where: { action: 'denied' } })).toBe(2);
  });
});

describe('config', () => {
  it('refuses demo mode in production', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        DATABASE_URL: 'file:x.db',
        SESSION_SECRET: 'x'.repeat(40),
        DEMO_MODE: 'true',
      }),
    ).toThrow(/DEMO_MODE/);
  });
});
