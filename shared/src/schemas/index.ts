import { z } from 'zod';
import { isValidThaiNationalId, normalizeNationalId } from '../domain/thaiId';
import { HN_LENGTH, isValidHn, normalizeHn } from '../domain/hn';
import { URGENCY_COLORS } from '../domain/urgency';

const isoDate = z.coerce.date({ errorMap: () => ({ message: 'วันที่ไม่ถูกต้อง' }) });
const optionalText = z.string().trim().max(2000).optional().nullable();

export const SEX = ['male', 'female'] as const;
export const PROGRAM_STATUS = ['active', 'discharged'] as const;
export const DISCHARGE_CODES = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'] as const;
export type DischargeCode = (typeof DISCHARGE_CODES)[number];
export const LAB_TESTS = ['gfr', 'scr', 'hba1c', 'albumin', 'potassium', 'sbp', 'dbp'] as const;
/** Usual albumin results; staff may also type another. Kept in `valueText`, with `value` 0. */
export const ALBUMIN_LEVELS = ['>30', '30–300', '>300', 'ปกติ'] as const;
export const YES_NO = ['yes', 'no'] as const;
export const ACEI_ARB = ['yes', 'no'] as const;
export const ACEI_ARB_DRUGS = ['enalapril', 'losartan'] as const;
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
  hn: z
    .string()
    .trim()
    .min(1, 'กรุณากรอก HN')
    .transform(normalizeHn)
    .refine(isValidHn, `HN ต้องเป็นตัวเลข ${HN_LENGTH} หลัก (พิมพ์ย่อด้วย / ได้ เช่น 45/70)`),
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
  valueText: z.string().trim().max(30, 'ค่า Albumin ยาวเกิน 30 ตัวอักษร').optional().nullable(),
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

/** One row of รายการยาที่เหลือ: drug, strength in mg, tablets left. */
export const leftoverItemSchema = z.object({
  drugName: z.string().trim().min(1, 'กรุณากรอกชื่อยาที่เหลือ').max(200),
  strengthMg: z.string().trim().max(30).optional().nullable(),
  remaining: z.coerce
    .number({ invalid_type_error: 'จำนวนเม็ดที่เหลือต้องเป็นตัวเลข' })
    .int('จำนวนเม็ดที่เหลือต้องเป็นจำนวนเต็ม')
    .min(0, 'จำนวนเม็ดที่เหลือต้องไม่ติดลบ'),
});
export type LeftoverItem = z.infer<typeof leftoverItemSchema>;

/**
 * Leftover medicines arrive as a list and are stored as JSON text in the visit's `leftoverMeds`
 * column (one text cell in the Sheet). Read them back with {@link parseLeftovers}.
 */
const leftoverMedsField = z
  .array(leftoverItemSchema)
  .max(30)
  .optional()
  .nullable()
  .transform((items) => (items && items.length ? JSON.stringify(items) : null));

/** Stored `leftoverMeds` → rows; text saved before the list existed comes back as `legacy`. */
export function parseLeftovers(stored: string | null | undefined): { items: LeftoverItem[]; legacy: string | null } {
  if (!stored) return { items: [], legacy: null };
  try {
    const parsed = z.array(leftoverItemSchema).safeParse(JSON.parse(stored));
    if (parsed.success) return { items: parsed.data, legacy: null };
  } catch {
    /* not JSON: free text from before */
  }
  return { items: [], legacy: stored };
}

const visitFields = {
  visitDate: isoDate,
  medicationTaking: z.enum(MEDICATION_TAKING),
  medicationTakingDetail: optionalText,
  leftoverMeds: leftoverMedsField,
  herbalOrPainkiller: z.boolean(),
  herbalDetail: optionalText,
  dietControlled: z.boolean(),
  dietDetail: optionalText,
  seasoning: z.enum(SEASONING),
  seasoningDetail: optionalText,
  furtherAdjustments: optionalText,
  nextAppointment: isoDate.optional().nullable(),
  aceiArb: z.enum(ACEI_ARB, { errorMap: () => ({ message: 'กรุณาเลือกว่ามียากลุ่ม ACEI/ARB หรือไม่' }) }),
  aceiArbDrug: z.enum(ACEI_ARB_DRUGS).optional().nullable(),
  aceiArbNoReason: optionalText,
  doctorMedChange: z.enum(YES_NO).optional().nullable(),
  doctorMedChangeDetail: optionalText,
  urgencyColor: z.enum(URGENCY_COLORS).optional().nullable(),
  nextSeePharmacist: z.enum(YES_NO).optional().nullable(),
};
type VisitRuleInput = {
  visitDate: Date;
  nextAppointment?: Date | null;
  aceiArb: 'yes' | 'no';
  aceiArbDrug?: (typeof ACEI_ARB_DRUGS)[number] | null;
  aceiArbNoReason?: string | null;
  doctorMedChange?: 'yes' | 'no' | null;
  doctorMedChangeDetail?: string | null;
  nextSeePharmacist?: 'yes' | 'no' | null;
  medicationTaking: 'correct' | 'incorrect';
  herbalOrPainkiller: boolean;
  dietControlled: boolean;
  seasoning: 'reduce_needed' | 'adjusted';
};
const appointmentAfterVisit = (v: VisitRuleInput) => !v.nextAppointment || v.nextAppointment >= v.visitDate;
const aceiReasonGiven = (v: VisitRuleInput) => v.aceiArb === 'yes' || !!v.aceiArbNoReason;
const APPOINTMENT_RULE = { message: 'วันนัดครั้งต่อไปต้องไม่ก่อนวันที่มา', path: ['nextAppointment'] };
const ACEI_RULE = { message: 'กรุณาระบุเหตุผลที่ไม่ได้รับยากลุ่ม ACEI/ARB', path: ['aceiArbNoReason'] };
const aceiDrugChosen = (v: VisitRuleInput) => v.aceiArb === 'no' || !!v.aceiArbDrug;
const ACEI_DRUG_RULE = { message: 'กรุณาเลือกยากลุ่ม ACEI/ARB ที่ผู้ป่วยใช้ (Enalapril หรือ Losartan)', path: ['aceiArbDrug'] };
const doctorChangeGiven = (v: VisitRuleInput) => v.doctorMedChange !== 'yes' || !!v.doctorMedChangeDetail;
const DOCTOR_CHANGE_RULE = { message: 'กรุณาระบุการปรับเปลี่ยนยาของแพทย์', path: ['doctorMedChangeDetail'] };
const seePharmacistChosen = (v: VisitRuleInput) => !v.nextAppointment || !!v.nextSeePharmacist;
const SEE_PHARMACIST_RULE = { message: 'กรุณาเลือกว่าครั้งถัดไปต้องพบเภสัชกรหรือไม่', path: ['nextSeePharmacist'] };
/** Drops a "please specify" text whose answer no longer asks for one (e.g. ไม่ถูกต้อง changed to ถูกต้อง). */
const clearUnusedDetails = <T extends VisitRuleInput>(v: T): T => ({
  ...v,
  ...(v.aceiArb === 'yes' && { aceiArbNoReason: null }),
  ...(v.aceiArb === 'no' && { aceiArbDrug: null }),
  ...(v.medicationTaking === 'correct' && { medicationTakingDetail: null }),
  ...(!v.herbalOrPainkiller && { herbalDetail: null }),
  ...(v.dietControlled && { dietDetail: null }),
  ...(v.seasoning === 'adjusted' && { seasoningDetail: null }),
  ...(v.doctorMedChange !== 'yes' && { doctorMedChangeDetail: null }),
  ...(!v.nextAppointment && { nextSeePharmacist: null }),
});

export const visitCreateSchema = z
  .object({
    ...visitFields,
    labs: z.array(labCreateSchema).max(20).default([]),
    medications: z.array(medicationCreateSchema).max(50).default([]),
  })
  .refine(appointmentAfterVisit, APPOINTMENT_RULE)
  .refine(aceiReasonGiven, ACEI_RULE)
  .refine(aceiDrugChosen, ACEI_DRUG_RULE)
  .refine(doctorChangeGiven, DOCTOR_CHANGE_RULE)
  .refine(seePharmacistChosen, SEE_PHARMACIST_RULE)
  .transform(clearUnusedDetails);
export type VisitCreate = z.infer<typeof visitCreateSchema>;

/** Edits the visit's own answers; its labs and medicines are edited in their own tabs. */
export const visitUpdateSchema = z
  .object(visitFields)
  .refine(appointmentAfterVisit, APPOINTMENT_RULE)
  .refine(aceiReasonGiven, ACEI_RULE)
  .refine(aceiDrugChosen, ACEI_DRUG_RULE)
  .refine(doctorChangeGiven, DOCTOR_CHANGE_RULE)
  .refine(seePharmacistChosen, SEE_PHARMACIST_RULE)
  .transform(clearUnusedDetails);
export type VisitUpdate = z.infer<typeof visitUpdateSchema>;

export const labUpdateSchema = labCreateSchema;
export type LabUpdate = z.infer<typeof labUpdateSchema>;

/** Full edit of a medicine, or just `{ status }` to stop / restart it. */
export const medicationUpdateSchema = medicationCreateSchema
  .partial()
  .extend({ status: z.enum(['active', 'stopped']).optional() });
export type MedicationUpdate = z.infer<typeof medicationUpdateSchema>;

export const drpCreateSchema = z.object({
  visitId: z.string().optional().nullable(),
  category: z.enum(DRP_CATEGORY),
  description: z.string().trim().min(1, 'กรุณาอธิบายปัญหา').max(2000),
  drugs: optionalText,
  severity: z.enum(SEVERITY),
  recommendation: z.string().trim().min(1, 'กรุณากรอกคำแนะนำของเภสัชกร').max(2000),
});
export type DrpCreate = z.infer<typeof drpCreateSchema>;

export const drpUpdateSchema = drpCreateSchema.omit({ visitId: true });
export type DrpUpdate = z.infer<typeof drpUpdateSchema>;

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
