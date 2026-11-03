import { parseLeftovers, type LeftoverItem } from '@rx/shared';
import { Icon } from './Icon';

export interface LeftoverRow {
  drugName: string;
  strengthMg: string;
  remaining: string;
}

const blankRow = (): LeftoverRow => ({ drugName: '', strengthMg: '', remaining: '' });

/** Stored visit value → editable rows (old free text lands in the drug-name box of one row). */
export function leftoverRowsFrom(stored: string | null | undefined): LeftoverRow[] {
  const { items, legacy } = parseLeftovers(stored);
  if (legacy) return [{ drugName: legacy, strengthMg: '', remaining: '' }];
  return items.map((i) => ({ drugName: i.drugName, strengthMg: i.strengthMg ?? '', remaining: String(i.remaining) }));
}

/** Rows → request body; completely empty rows are dropped. */
export const leftoverPayload = (rows: LeftoverRow[]) =>
  rows
    .filter((r) => r.drugName.trim() || r.strengthMg.trim() || r.remaining.trim())
    .map((r) => ({ drugName: r.drugName, strengthMg: r.strengthMg || null, remaining: r.remaining }));

/** "Amlodipine 10 mg เหลือ 12 เม็ด" */
export const leftoverText = (i: LeftoverItem) =>
  `${i.drugName}${i.strengthMg ? ` ${i.strengthMg} mg` : ''} เหลือ ${i.remaining} เม็ด`;

/** รายการยาที่เหลือ: one row per medicine (name, mg, tablets left). */
export function LeftoverEditor({ idPrefix, rows, onChange }: { idPrefix: string; rows: LeftoverRow[]; onChange: (rows: LeftoverRow[]) => void }) {
  const update = (i: number, patch: Partial<LeftoverRow>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="leftovers">
      <div className="leftovers-head">
        <b>รายการยาที่เหลือ</b>
        <button type="button" className="btn secondary small" onClick={() => onChange([...rows, blankRow()])}>
          <Icon name="plus" />
          เพิ่มยาที่เหลือ
        </button>
      </div>
      {rows.length === 0 && <p className="muted" style={{ margin: 0 }}>ถ้าผู้ป่วยมียาเหลือ กด "เพิ่มยาที่เหลือ"</p>}
      {rows.map((r, i) => (
        <div key={i} className="leftover-row">
          <label>
            <span>ชื่อยา</span>
            <input id={`${idPrefix}-n${i}`} value={r.drugName} onChange={(e) => update(i, { drugName: e.target.value })} placeholder="เช่น Amlodipine" />
          </label>
          <label>
            <span>ขนาด (mg)</span>
            <input id={`${idPrefix}-m${i}`} inputMode="decimal" value={r.strengthMg} onChange={(e) => update(i, { strengthMg: e.target.value })} placeholder="เช่น 10" />
          </label>
          <label>
            <span>จำนวนเม็ดที่เหลือ</span>
            <input id={`${idPrefix}-c${i}`} inputMode="numeric" value={r.remaining} onChange={(e) => update(i, { remaining: e.target.value.replace(/\D/g, '') })} placeholder="เม็ด" />
          </label>
          <button type="button" className="btn secondary small danger" aria-label={`ลบแถวยาที่เหลือ ${i + 1}`} onClick={() => onChange(rows.filter((_, j) => j !== i))}>
            <Icon name="trash" />
          </button>
        </div>
      ))}
    </div>
  );
}
