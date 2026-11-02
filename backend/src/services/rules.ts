import { DEFAULT_RULES, type ClinicalRules } from '@rx/shared';
import { prisma } from '../db';

/** Latest rule version already in effect; falls back to the unapproved demo defaults. */
export async function activeRules(now = new Date()): Promise<ClinicalRules> {
  const row = await prisma.ruleVersion.findFirst({
    where: { effectiveFrom: { lte: now } },
    orderBy: { version: 'desc' },
  });
  if (!row) return DEFAULT_RULES;
  return { ...DEFAULT_RULES, ...(JSON.parse(row.values) as Partial<ClinicalRules>), version: row.version, approved: row.approved };
}
