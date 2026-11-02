import { describe, expect, it } from 'vitest';
import { dischargeSchema, LABELS, summarizeMonth } from '../src';

describe('dischargeSchema', () => {
  it('accepts a listed reason with a date', () => {
    const r = dischargeSchema.safeParse({ dischargeCode: '02', dischargeDate: '2026-11-02' });
    expect(r.success).toBe(true);
  });

  it('rejects an unknown reason code', () => {
    expect(dischargeSchema.safeParse({ dischargeCode: '13', dischargeDate: '2026-11-02' }).success).toBe(false);
  });

  it('requires details for 12 (other)', () => {
    const r = dischargeSchema.safeParse({ dischargeCode: '12', dischargeDate: '2026-11-02' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe('กรุณาระบุสาเหตุเพิ่มเติม');
    expect(dischargeSchema.safeParse({ dischargeCode: '12', dischargeDate: '2026-11-02', dischargeNote: 'ย้ายไปอยู่กับบุตร' }).success).toBe(true);
  });

  it('has a Thai label and meaning for all 12 reasons', () => {
    expect(Object.keys(LABELS.discharge)).toHaveLength(12);
    expect(LABELS.discharge['02']).toBe('เข้าสู่ระบบบำบัดทดแทนไต (RRT)');
  });
});

describe('summarizeMonth discharges', () => {
  it('counts discharges by reason', () => {
    const s = summarizeMonth('2026-11', [], [], 0, [{ dischargeCode: '02' }, { dischargeCode: '02' }, { dischargeCode: '07' }]);
    expect(s.discharges).toBe(3);
    expect(s.dischargesByReason).toEqual({ '02': 2, '07': 1 });
  });
});
