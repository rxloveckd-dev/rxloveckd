/**
 * Synthetic demo data only (clinic constitution §4). Refuses to run outside demo mode.
 * Names and IDs are generated; any resemblance to real people is coincidental.
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { DEFAULT_RULES } from '@rx/shared';
import { loadConfig } from '../src/config';

const config = loadConfig();
if (!config.DEMO_MODE || config.NODE_ENV === 'production') {
  throw new Error('Seed refused: set DEMO_MODE=true and NODE_ENV!=production');
}

const prisma = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;
const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
const daysFromToday = (n: number) => new Date(today.getTime() + n * DAY);

/** Deterministic pseudo-random numbers so the demo looks the same on every machine. */
let state = 20261102;
const rand = () => ((state = (state * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!;

function syntheticNationalId(n: number): string {
  const base = `8${String(990000000 + n).padStart(11, '0')}`.slice(0, 12);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(base[i]) * (13 - i);
  return base + ((11 - (sum % 11)) % 10);
}

const FIRST_M = ['สมชาย', 'ประเสริฐ', 'บุญมี', 'สุชาติ', 'วิชัย', 'อำนาจ', 'สมศักดิ์', 'ทองดี', 'มานพ', 'ชาตรี'];
const FIRST_F = ['สมศรี', 'มาลี', 'บุญเรือน', 'ประไพ', 'สุดา', 'วันเพ็ญ', 'จันทร์เพ็ญ', 'ละเอียด', 'นวลจันทร์', 'สายใจ'];
const LAST = ['ใจดี', 'มีสุข', 'ทองคำ', 'ศรีสุข', 'แก้วมณี', 'บุญมา', 'สายทอง', 'พึ่งบุญ', 'รักไทย', 'เขาชัย', 'นาคสวัสดิ์', 'ดวงแก้ว'];

// [gfr previous, gfr latest, appointment offset days, incorrect taking, herbal]
const PROFILES: [number, number, number, boolean, boolean][] = [
  [92, 95, 30, false, false],
  [75, 72, 25, false, false],
  [64, 61, 40, false, false],
  [55, 52, 5, false, false],
  [50, 47, 20, true, false],
  [42, 40, 3, false, true],
  [38, 36, 45, false, false],
  [44, 31, -6, false, false],
  [33, 30, 12, true, true],
  [28, 26, 14, false, false],
  [22, 18, 2, false, false],
  [16, 12, 9, false, false],
  [58, 41, 21, false, false],
  [70, 66, -15, false, false],
];

async function main() {
  const passwordHash = await bcrypt.hash('demo1234', 10);
  const users = await Promise.all(
    [
      { username: 'pharm1', displayName: 'ภก.สมหมาย ดูแลไต', role: 'pharmacist' },
      { username: 'pharm2', displayName: 'ภญ.วรรณา รักษ์ไต', role: 'pharmacist' },
      { username: 'super1', displayName: 'ภญ.หัวหน้า เขาชัยสน', role: 'supervisor' },
      { username: 'admin1', displayName: 'ผู้ดูแลระบบ', role: 'admin' },
    ].map((u) => prisma.user.upsert({ where: { username: u.username }, update: {}, create: { ...u, passwordHash } })),
  );
  const pharmacists = users.filter((u) => u.role === 'pharmacist');

  await prisma.ruleVersion.upsert({
    where: { version: 1 },
    update: {},
    create: {
      version: 1,
      effectiveFrom: new Date(Date.UTC(2026, 0, 1)),
      rationale: 'ค่าเริ่มต้นสำหรับทดลองใช้ (KDIGO 2012 GFR categories) รอทีมคลินิกอนุมัติ',
      reviewer: 'ยังไม่ได้ตรวจสอบ',
      approved: false,
      values: JSON.stringify(DEFAULT_RULES),
    },
  });

  if ((await prisma.patient.count()) > 0) {
    console.log('Patients already exist; skipping patient seed.');
    return;
  }

  for (let i = 0; i < 30; i++) {
    const [prevGfr, gfr, apptOffset, incorrect, herbal] = PROFILES[i % PROFILES.length]!;
    const sex = rand() < 0.5 ? 'male' : 'female';
    const pharmacist = pick(pharmacists);
    const patient = await prisma.patient.create({
      data: {
        nationalId: syntheticNationalId(i + 1),
        hn: String(650001 + i).padStart(7, '0'),
        title: sex === 'male' ? 'นาย' : pick(['นาง', 'นางสาว']),
        firstName: pick(sex === 'male' ? FIRST_M : FIRST_F),
        lastName: pick(LAST),
        birthDate: new Date(Date.UTC(1940 + Math.floor(rand() * 35), Math.floor(rand() * 12), 1 + Math.floor(rand() * 27))),
        sex,
        ckdCause: pick(['เบาหวาน', 'ความดันโลหิตสูง', 'เบาหวานและความดัน', null]),
        enrolledAt: daysFromToday(-200 + i * 5),
        responsiblePharmacistId: pharmacist.id,
        notes: 'ข้อมูลสมมติสำหรับทดลองระบบ',
      },
    });

    const visit1 = daysFromToday(-120 + (i % 7));
    const visit2 = daysFromToday(-40 + (i % 9));
    const v1 = await prisma.visit.create({
      data: {
        patientId: patient.id,
        visitNo: 1,
        visitDate: visit1,
        medicationTaking: 'correct',
        herbalOrPainkiller: false,
        dietControlled: rand() < 0.6,
        seasoning: 'reduce_needed',
        furtherAdjustments: 'ลดเค็ม ทบทวนการกินยา',
        nextAppointment: visit2,
        pharmacistId: pharmacist.id,
      },
    });
    const v2 = await prisma.visit.create({
      data: {
        patientId: patient.id,
        visitNo: 2,
        visitDate: visit2,
        medicationTaking: incorrect ? 'incorrect' : 'correct',
        herbalOrPainkiller: herbal,
        herbalDetail: herbal ? 'ยาแก้ปวดกลุ่ม NSAID ซื้อจากร้านขายยา' : null,
        dietControlled: rand() < 0.7,
        seasoning: rand() < 0.5 ? 'adjusted' : 'reduce_needed',
        furtherAdjustments: incorrect ? 'สอนวิธีกินยาความดันใหม่' : null,
        nextAppointment: daysFromToday(apptOffset),
        pharmacistId: pharmacist.id,
      },
    });

    const scr = (g: number) => Math.round((90 / g) * 100) / 100;
    for (const [visit, date, g] of [
      [v1, new Date(visit1.getTime() - 3 * DAY), prevGfr],
      [v2, new Date(visit2.getTime() - 3 * DAY), gfr],
    ] as const) {
      await prisma.labResult.createMany({
        data: [
          { patientId: patient.id, visitId: visit.id, test: 'gfr', value: g, unit: 'mL/min/1.73m²', collectedAt: date, origin: 'user_entered' },
          { patientId: patient.id, visitId: visit.id, test: 'scr', value: scr(g), unit: 'mg/dL', collectedAt: date, origin: 'user_entered' },
          { patientId: patient.id, visitId: visit.id, test: 'albumin', value: Math.round(20 + rand() * 300), unit: 'mg/g', collectedAt: date, origin: 'user_entered' },
          { patientId: patient.id, visitId: visit.id, test: 'potassium', value: Math.round((3.8 + rand() * (g < 20 ? 2.2 : 1.2)) * 10) / 10, unit: 'mmol/L', collectedAt: date, origin: 'user_entered' },
        ],
      });
    }

    await prisma.medication.createMany({
      data: [
        { patientId: patient.id, visitId: v1.id, drugName: pick(['Enalapril', 'Losartan']), strength: pick(['5 mg', '50 mg']), directions: '1 เม็ด เช้า', drugClass: rand() < 0.5 ? 'acei' : 'arb' },
        { patientId: patient.id, visitId: v1.id, drugName: 'Amlodipine', strength: '5 mg', directions: '1 เม็ด เช้า', drugClass: 'other_antihypertensive' },
        ...(rand() < 0.5 ? [{ patientId: patient.id, visitId: v1.id, drugName: 'Metformin', strength: '500 mg', directions: '1 เม็ด เช้า-เย็น หลังอาหาร', drugClass: 'diabetes' }] : []),
      ],
    });

    if (herbal) {
      await prisma.drp.create({
        data: {
          patientId: patient.id,
          visitId: v2.id,
          recordedAt: visit2,
          category: 'avoid_in_ckd',
          description: 'ผู้ป่วยซื้อยาแก้ปวดกลุ่ม NSAID กินเอง',
          drugs: 'Ibuprofen',
          severity: 'medium',
          recommendation: 'แนะนำหยุด NSAID ใช้ paracetamol แทน และแจ้งแพทย์',
          pharmacistId: pharmacist.id,
        },
      });
    }
  }
  console.log('Seeded 30 synthetic patients, demo users: pharm1, pharm2, super1, admin1 (password demo1234)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
