import { z } from 'zod';
import { isValidThaiNationalId, normalizeNationalId } from '../domain/thaiId';

const isoDate = z.coerce.date({ invalid_type_error: 'วันที่ไม่ถูกต้อง' });
const optionalText = z.string().trim().max(2000).optional().nullable();

export const SEX = ['male', 'female'] as const;
export const PROGRAM_STATUS = ['active', 'discharged'] as const;
export const DISCHARGE_CODES = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'] as const;
export type DischargeCode = (typeof DISCHARGE_CODES)[number];
export const LAB_TESTS = ['gfr', 'scr', 'hba1c', 'albumin', 'potassium', 'sbp', 'dbp'] as const;
export const ACEI_ARB = ['yes', 'no'] as const;
export const MEDICATION_TAKING = ['correct', 'incorrect'] as const;
export const SEASONING = ['reduce_needed', 'adjusted'] as const;
export const DRUG_CLASS = ['acei', 'arb', 'nsaid', 'diabetes', 'other_antihypertensive', 'diuretic', 'other'] as const;
export const DRP_CATEGORY = [
  'renal_dose',
  'avoid_in_ckd',
  'interaction',
  'adverse_effect',
  'adherence',
  'untreated_indication',
  'other',
] as const;
export const SEVERITY = ['low', 'medium', 'high'] as const;
export const PRESCRIBER_DECISION = ['pending', 'accepted', 'modified', 'declined'] as const;

export const patientCreateSchema = z.object({
  nationalId: z
    .string()
    .transform(normalizeNationalId)
    .refine(isValidThaiNationalId, 'เลขบัตรประชาชนไม่ถูกต้อง (ต้องมี 13 หลักและเลขตรวจสอบถูกต้อง)'),
  hn: z.string().trim().min(1, 'กรุณากรอก HN').max(20),
  title: z.string().trim().min(1, 'กรุณาเลือกคำนำหน้า').max(30),
  firstName: z.string().trim().min(1, 'กรุณากรอกชื่อ').max(100),
  lastName: z.string().trim().min(1, 'กรุณากรอกนามสกุล').max(100),
  birthDate: isoDate,
  sex: z.enum(SEX, { errorMap: () => ({ message: 'กรุณาเลือกเพศ' }) }),
  ckdCause: optionalText,
  enrolledAt: isoDate,
  notes: optionalText,
});
export type PatientCreate = z.infer<typeof patientCreateSchema>;

/** Demographic edits only; program status changes go through discharge / reactivate. */
export const patientUpdateSchema = patientCreateSchema.omit({ nationalId: true }).partial();
export type PatientUpdate = z.infer<typeof patientUpdateSchema>;

export const dischargeSchema = z
  .object({
    dischargeCode: z.enum(DISCHARGE_CODES, { errorMap: () => ({ message: 'กรุณาเลือกสาเหตุการจำหน่าย' }) }),
    dischargeDate: isoDate,
    dischargeNote: optionalText,
  })
  .refine((d) => d.dischargeCode !== '12' || !!d.dischargeNote, {
    message: 'กรุณาระบุสาเหตุเพิ่มเติม',
    path: ['dischargeNote'],
  });
export type DischargeInput = z.infer<typeof dischargeSchema>;

export const labCreateSchema = z.object({
  test: z.enum(LAB_TESTS),
  value: z.coerce.number({ invalid_type_error: 'ค่าผลแล็บต้องเป็นตัวเลข' }),
  unit: z.string().trim().min(1, 'กรุณาระบุหน่วย').max(30),
  collectedAt: isoDate,
  source: z.string().trim().max(50).default('บันทึกเอง'),
});
export type LabCreate = z.infer<typeof labCreateSchema>;

export const medicationCreateSchema = z.object({
  drugName: z.string().trim().min(1, 'กรุณากรอกชื่อยา').max(200),
  strength: optionalText,
  directions: optionalText,
  drugClass: z.enum(DRUG_CLASS).default('other'),
  startDate: isoDate.optional().nullable(),
  notes: optionalText,
});
export type MedicationCreate = z.infer<typeof medicationCreateSchema>;

export const visitCreateSchema = z
  .object({
    visitDate: isoDate,
    medicationTaking: z.enum(MEDICATION_TAKING),
    herbalOrPainkiller: z.boolean(),
    herbalDetail: optionalText,
    dietControlled: z.boolean(),
    seasoning: z.enum(SEASONING),
    furtherAdjustments: optionalText,
    nextAppointment: isoDate.optional().nullable(),
    aceiArb: z.enum(ACEI_ARB, { errorMap: () => ({ message: 'กรุณาเลือกว่ามียากลุ่ม ACEI/ARB หรือไม่' }) }),
    aceiArbNoReason: optionalText,
    labs: z.array(labCreateSchema).max(20).default([]),
    medications: z.array(medicationCreateSchema).max(50).default([]),
  })
  .refine((v) => !v.nextAppointment || v.nextAppointment >= v.visitDate, {
    message: 'วันนัดครั้งต่อไปต้องไม่ก่อนวันที่มา',
    path: ['nextAppointment'],
  })
  .refine((v) => v.aceiArb === 'yes' || !!v.aceiArbNoReason, {
    message: 'กรุณาระบุเหตุผลที่ไม่ได้รับยากลุ่ม ACEI/ARB',
    path: ['aceiArbNoReason'],
  })
  .transform((v) => (v.aceiArb === 'yes' ? { ...v, aceiArbNoReason: null } : v));
export type VisitCreate = z.infer<typeof visitCreateSchema>;

export const drpCreateSchema = z.object({
  visitId: z.string().optional().nullable(),
  category: z.enum(DRP_CATEGORY),
  description: z.string().trim().min(1, 'กรุณาอธิบายปัญหา').max(2000),
  drugs: optionalText,
  severity: z.enum(SEVERITY),
  recommendation: z.string().trim().min(1, 'กรุณากรอกคำแนะนำของเภสัชกร').max(2000),
});
export type DrpCreate = z.infer<typeof drpCreateSchema>;

export const drpDecisionSchema = z
  .object({
    prescriberDecision: z.enum(PRESCRIBER_DECISION),
    prescriberReason: optionalText,
  })
  .refine((d) => d.prescriberDecision !== 'declined' || !!d.prescriberReason, {
    message: 'กรุณาระบุเหตุผลเมื่อแพทย์ไม่ยอมรับ',
    path: ['prescriberReason'],
  });
export type DrpDecision = z.infer<typeof drpDecisionSchema>;

export const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});
