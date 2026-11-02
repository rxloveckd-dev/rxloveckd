import { useState, type ReactNode } from 'react';
import { num } from '../format';

/** Number tile: label, value, optional comparison line. */
export function StatTile({ label, value, note, tone }: { label: string; value: ReactNode; note?: ReactNode; tone?: 'alert' }) {
  return (
    <div className={`stat${tone === 'alert' ? ' stat-alert' : ''}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {note && <span className="stat-note">{note}</span>}
    </div>
  );
}

/** Collapsible table twin so no value depends on color or hover. */
function TableView({ head, rows }: { head: [string, string]; rows: [string, string][] }) {
  return (
    <details className="table-view">
      <summary>ดูเป็นตาราง</summary>
      <table>
        <thead>
          <tr><th>{head[0]}</th><th className="num">{head[1]}</th></tr>
        </thead>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}><td>{k}</td><td className="num">{v}</td></tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export interface Segment {
  key: string;
  label: string;
  value: number;
  color: string;
}

/** Part-to-whole on one row; 2px surface gaps between segments; legend with counts always shown. */
export function StackedBar({ segments, unit = 'คน', onSelect }: { segments: Segment[]; unit?: string; onSelect?: (key: string) => void }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const [hover, setHover] = useState<string | null>(null);
  const active = segments.find((s) => s.key === hover);
  return (
    <div className="stacked">
      <div className="stacked-track" role="img" aria-label={segments.map((s) => `${s.label} ${s.value} ${unit}`).join(', ')}>
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <button
              key={s.key}
              type="button"
              className="stacked-seg"
              style={{ flexGrow: s.value, background: s.color }}
              onMouseEnter={() => setHover(s.key)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(s.key)}
              onBlur={() => setHover(null)}
              onClick={() => onSelect?.(s.key)}
              aria-label={`${s.label} ${s.value} ${unit}`}
            />
          ))}
      </div>
      <div className="chart-tip" aria-live="polite">
        {active ? `${active.label}: ${num(active.value)} ${unit} (${Math.round((active.value / total) * 100)}%)` : ' '}
      </div>
      <ul className="legend">
        {segments.map((s) => (
          <li key={s.key}>
            <span className="key" style={{ background: s.color }} />
            {s.label} <b>{num(s.value)}</b>
            <span className="muted"> ({Math.round((s.value / total) * 100)}%)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Single-series columns over time; value labels on the latest and the highest column only. */
export function ColumnChart({ data, unit }: { data: { label: string; value: number }[]; unit: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 520;
  const H = 250;
  const pad = { top: 22, right: 8, bottom: 28, left: 30 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const max = Math.max(4, ...data.map((d) => d.value));
  const step = Math.max(1, Math.ceil(max / 4));
  const top = step * 4;
  const band = plotW / data.length;
  const barW = Math.min(24, band * 0.5);
  const y = (v: number) => pad.top + plotH - (v / top) * plotH;
  const peak = data.reduce((m, d, i) => (d.value > (data[m]?.value ?? -1) ? i : m), 0);

  return (
    <div className="column-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={data.map((d) => `${d.label} ${d.value} ${unit}`).join(', ')}>
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <line x1={pad.left} x2={W - pad.right} y1={y(i * step)} y2={y(i * step)} className="grid" />
            <text x={pad.left - 6} y={y(i * step) + 4} className="tick" textAnchor="end">{i * step}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = pad.left + band * i + band / 2;
          const h = Math.max(0, y(0) - y(d.value));
          const r = Math.min(4, h);
          const x0 = cx - barW / 2;
          const yTop = y(d.value);
          const showLabel = i === data.length - 1 || i === peak || hover === i;
          return (
            <g
              key={d.label}
              tabIndex={0}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="col"
            >
              <rect x={pad.left + band * i} y={pad.top} width={band} height={plotH} fill="transparent" />
              {h > 0 && (
                <path
                  d={`M${x0},${y(0)} V${yTop + r} Q${x0},${yTop} ${x0 + r},${yTop} H${x0 + barW - r} Q${x0 + barW},${yTop} ${x0 + barW},${yTop + r} V${y(0)} Z`}
                  className={i === data.length - 1 ? 'bar current' : 'bar'}
                />
              )}
              {showLabel && (
                <text x={cx} y={yTop - 6} textAnchor="middle" className="value">{d.value}</text>
              )}
              <text x={cx} y={H - 8} textAnchor="middle" className="tick">{d.label}</text>
            </g>
          );
        })}
      </svg>
      <div className="chart-tip" aria-live="polite">
        {hover !== null && data[hover] ? `${data[hover].label}: ${num(data[hover].value)} ${unit}` : ' '}
      </div>
      <TableView head={['เดือน', unit]} rows={data.map((d) => [d.label, num(d.value)])} />
    </div>
  );
}

/** Horizontal bars as a share of a whole (e.g. % of visits), one color, value at the tip. */
export function ShareBars({ rows, total, unit }: { rows: { label: string; value: number }[]; total: number; unit: string }) {
  return (
    <div className="share-bars">
      {rows.map((r) => {
        const pct = total ? (r.value / total) * 100 : 0;
        return (
          <div key={r.label} className="share-row" title={`${r.label}: ${r.value} จาก ${total} ${unit}`}>
            <span className="share-label">{r.label}</span>
            <span className="share-track">
              <span className="share-fill" style={{ width: `${pct}%` }} />
            </span>
            <span className="share-value">
              {Math.round(pct)}% <span className="muted">({r.value})</span>
            </span>
          </div>
        );
      })}
      {total === 0 && <p className="muted" style={{ margin: 0 }}>ยังไม่มีการติดตามในเดือนนี้</p>}
    </div>
  );
}
