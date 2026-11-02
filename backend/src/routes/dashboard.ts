import { Router } from 'express';
import ExcelJS from 'exceljs';
import { z } from 'zod';
import { LABELS, type CkdStage, type UrgencyColor } from '@rx/shared';
import { prisma } from '../db';
import { audit } from '../audit';
import { CLINICAL, requireRole } from '../auth';
import { activeRules } from '../services/rules';
import { listSummaries } from '../services/patients';
import { monthlySummary } from '../services/reports';

const monthQuery = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'รูปแบบเดือนต้องเป็น ปปปป-ดด'),
});

const currentMonth = () => new Date().toISOString().slice(0, 7);

export function dashboardRouter(): Router {
  const r = Router();
  r.use(requireRole(...CLINICAL));

  r.get('/dashboard', async (_req, res) => {
    const rules = await activeRules();
    const patients = await listSummaries(rules, new Date());
    const byColor: Record<UrgencyColor, number> = { red: 0, orange: 0, yellow: 0, green: 0 };
    const byStage: Record<CkdStage | 'unknown', number> = { '1': 0, '2': 0, '3a': 0, '3b': 0, '4': 0, '5': 0, unknown: 0 };
    for (const p of patients) {
      byColor[p.color] += 1;
      byStage[p.stage ?? 'unknown'] += 1;
    }
    const pendingDecisions = await prisma.drp.count({ where: { prescriberDecision: 'pending' } });
    res.json({
      counts: { total: patients.length, byColor, byStage, pendingDecisions },
      red: patients.filter((p) => p.color === 'red').slice(0, 20),
      missed: patients.filter((p) => p.appointment === 'missed'),
      upcoming: patients
        .filter((p) => p.appointment === 'upcoming')
        .sort((a, b) => (a.nextAppointment ?? '').localeCompare(b.nextAppointment ?? '')),
      insufficientData: patients.filter((p) => p.gfrFlags.includes('missing') || p.gfrFlags.includes('stale')),
      month: await monthlySummary(currentMonth()),
      rules: { version: rules.version, approved: rules.approved },
    });
  });

  r.get('/reports/monthly', async (req, res) => {
    const { month } = monthQuery.parse(req.query);
    res.json(await monthlySummary(month));
  });

  r.get('/reports/monthly.xlsx', async (req, res) => {
    const { month } = monthQuery.parse(req.query);
    const s = await monthlySummary(month);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('สรุปรายเดือน');
    ws.columns = [
      { header: 'รายการ', key: 'label', width: 42 },
      { header: 'จำนวน', key: 'value', width: 12 },
    ];
    ws.addRows([
      { label: 'เดือน', value: s.month },
      { label: 'จำนวนครั้งที่ผู้ป่วยมาติดตาม', value: s.visits },
      { label: 'จำนวนผู้ป่วยที่มาติดตาม (คน)', value: s.patientsSeen },
      { label: 'ผู้ป่วยลงทะเบียนใหม่', value: s.newEnrollments },
      { label: 'กินยาไม่ถูกต้อง (ครั้ง)', value: s.incorrectTaking },
      { label: 'กินยาสมุนไพร/ยาแก้ปวด (ครั้ง)', value: s.herbalOrPainkiller },
      { label: 'ไม่คุมอาหาร (ครั้ง)', value: s.dietUncontrolled },
      { label: 'เครื่องปรุงควรปรับลด (ครั้ง)', value: s.seasoningReduceNeeded },
      { label: 'DRP ที่พบ', value: s.drps },
      { label: 'DRP ที่แพทย์ยอมรับ (รวมยอมรับแบบปรับ)', value: s.drpsAccepted },
      ...Object.entries(s.drpsByCategory).map(([k, v]) => ({
        label: `DRP: ${LABELS.drpCategory[k as keyof typeof LABELS.drpCategory] ?? k}`,
        value: v,
      })),
    ]);
    ws.getRow(1).font = { bold: true };
    await audit(req, 'export', 'report_monthly', month);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="loveckd-summary-${month}.xlsx"`);
    res.send(Buffer.from(await wb.xlsx.writeBuffer()));
  });

  return r;
}
