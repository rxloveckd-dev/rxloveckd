import bcrypt from 'bcryptjs';
import request from 'supertest';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config';
import { prisma } from '../src/db';

export const app = createApp(loadConfig());

export async function resetDb() {
  await prisma.auditLog.deleteMany();
  await prisma.drp.deleteMany();
  await prisma.medication.deleteMany();
  await prisma.labResult.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.ruleVersion.deleteMany();
  await prisma.user.deleteMany();
  const passwordHash = await bcrypt.hash('pw', 4);
  await prisma.user.createMany({
    data: [
      { username: 'pharm', displayName: 'ภก.ทดสอบ', role: 'pharmacist', passwordHash },
      { username: 'super', displayName: 'ภญ.หัวหน้า', role: 'supervisor', passwordHash },
      { username: 'admin', displayName: 'ผู้ดูแล', role: 'admin', passwordHash },
    ],
  });
}

/** Logged-in supertest agent (keeps the session cookie). */
export async function login(username: 'pharm' | 'super' | 'admin') {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ username, password: 'pw' }).expect(200);
  return agent;
}

export const VALID_ID = '1101700207030';

export const patientBody = (overrides: Record<string, unknown> = {}) => ({
  nationalId: VALID_ID,
  hn: '000000123',
  title: 'นาย',
  firstName: 'ทดสอบ',
  lastName: 'ระบบ',
  birthDate: '1960-05-01',
  sex: 'male',
  enrolledAt: '2026-10-01',
  ...overrides,
});
