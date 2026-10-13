import React, { useEffect, useRef, useState } from "react";
import { FiArrowDownRight, FiArrowUpRight, FiMinus } from "react-icons/fi";
import HealthIcon from "components/HealthIcon.js";
import { PALETTE } from "components/care/palette.js";

// Small, dependency-free charts for the analytics pages, in the style of the
// rest of ECMS: one accent colour for "this period", grey for "previous".

function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

const todayYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const shortDate = (ymd) => new Date(ymd + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
// A plain status line in the same place as a Delta: tone "good" | "bad" | "flat"
export const Note = ({ tone = "flat", children }) => <span className={`ca-delta ca-delta--${tone}`}>{children}</span>;

export const fmtPct = (v) => (v === null || v === undefined ? "–" : `${Number(v).toFixed(v % 1 ? 1 : 0)}%`);

// Change against the previous period. unit "pts" for rates, "count" for numbers.
// goodWhen: which direction is good news ("up" or "down").
export function Delta({ now, before, unit = "pts", goodWhen = "up", label = "vs previous period" }) {
  if (now === null || now === undefined || before === null || before === undefined) {
    return <span className="ca-delta ca-delta--flat">No earlier data</span>;
  }
  const diff = Math.round((now - before) * 10) / 10;
  const good = diff === 0 ? null : (diff > 0) === (goodWhen === "up");
  const Icon = diff > 0 ? FiArrowUpRight : diff < 0 ? FiArrowDownRight : FiMinus;
  const amount = unit === "pts" ? `${Math.abs(diff).toFixed(1)} pts` : Math.abs(diff);
  return (
    <span className={"ca-delta " + (good === null ? "ca-delta--flat" : good ? "ca-delta--good" : "ca-delta--bad")}>
      <Icon aria-hidden="true" />
      {diff === 0 ? "No change" : `${diff > 0 ? "+" : "−"}${amount}`}
      <span className="ca-delta__label"> {label}</span>
    </span>
  );
}

// Key figures in one card, separated by thin rules
export function KpiStrip({ items }) {
  return (
    <div className="ca-kpis" style={{ "--ca-cols": items.length }}>
      {items.map((k) => (
        <div className="ca-kpi" key={k.label}>
          <div className="ca-kpi__label">
            {typeof k.icon === "string" ? <HealthIcon name={k.icon} size={18} /> : k.icon}
            {k.label}
          </div>
          {k.sub && <div className="ca-kpi__sub">{k.sub}</div>}
          <div className="ca-kpi__value">{k.value ?? "–"}</div>
          {k.delta}
        </div>
      ))}
    </div>
  );
}

// Card with an icon tile, title, optional legend on the right
export function ChartCard({ icon, title, sub, legend, actions, children, className = "" }) {
  return (
    <section className={"ca-card " + className}>
      <header className="ca-card__head">
        <div className="ca-card__title">
          {icon && (
            <span className="ca-card__icon" aria-hidden="true">
              <HealthIcon name={icon} size={20} />
            </span>
          )}
          <div>
            <h3>{title}</h3>
            {sub && <p>{sub}</p>}
          </div>
        </div>
        {legend && <Legend items={legend} />}
        {actions}
      </header>
      <div className="ca-card__body">{children}</div>
    </section>
  );
}

export function Legend({ items }) {
  return (
    <ul className="ca-legend" aria-label="Legend">
      {items.map((l) => (
        <li key={l.label}>
          <i style={{ background: l.color, ...(l.dashed ? { background: "none", borderTop: `2px dashed ${l.color}`, height: 0 } : {}) }} />
          {l.label}
        </li>
      ))}
    </ul>
  );
}

// Line + area for this period, dashed line for the previous period (same length).
// values are percentages (or null where nothing was due).
export function TrendChart({ dates, current, previous = [], height = 230, format = fmtPct, ariaLabel }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const M = { top: 12, right: 12, bottom: 26, left: 40 };
  const innerW = Math.max(width - M.left - M.right, 10);
  const innerH = height - M.top - M.bottom;
  const all = [...current, ...previous].filter((v) => v !== null && v !== undefined);
  const lo = all.length ? Math.max(0, Math.floor((Math.min(...all) - 5) / 10) * 10) : 0;
  const hi = 100;
  const stepY = hi - lo <= 50 ? 10 : hi - lo <= 100 ? 20 : 25;
  const ticks = [];
  for (let t = lo; t <= hi; t += stepY) ticks.push(t);
  const x = (i) => M.left + (dates.length > 1 ? (i / (dates.length - 1)) * innerW : innerW / 2);
  const y = (v) => M.top + innerH - ((v - lo) / (hi - lo || 1)) * innerH;
  const line = (vals) => {
    let d = "";
    let pen = false;
    vals.forEach((v, i) => {
      if (v === null || v === undefined) { pen = false; return; }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };
  const known = current.map((v, i) => [v, i]).filter(([v]) => v !== null && v !== undefined);
  const area = known.length > 1
    ? `M${x(known[0][1])},${y(lo)}` + known.map(([v, i]) => `L${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("") + `L${x(known[known.length - 1][1])},${y(lo)}Z`
    : "";
  const step = Math.max(1, Math.ceil(dates.length / 7));

  return (
    <div className="ca-trend" ref={ref} onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel}>
          <defs>
            <linearGradient id="ca-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={PALETTE.teal} stopOpacity="0.22" />
              <stop offset="100%" stopColor={PALETTE.teal} stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke={PALETTE.grid} />
              <text x={M.left - 8} y={y(t)} className="ca-axis" textAnchor="end" dominantBaseline="middle">{t}%</text>
            </g>
          ))}
          {dates.map((d, i) => (i % step === 0 || i === dates.length - 1) && (
            <text key={d} x={x(i)} y={height - 6} className="ca-axis" textAnchor={i === 0 ? "start" : i === dates.length - 1 ? "end" : "middle"}>{shortDate(d)}</text>
          ))}
          {area && <path d={area} fill="url(#ca-area)" />}
          {previous.length > 0 && <path d={line(previous)} fill="none" stroke={PALETTE.prev} strokeWidth="2" strokeDasharray="5 4" />}
          <path d={line(current)} fill="none" stroke={PALETTE.teal} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {current.map((v, i) => v !== null && v !== undefined && (dates.length <= 31 || i === dates.length - 1) && (
            <circle key={i} cx={x(i)} cy={y(v)} r={hover === i ? 4.5 : 3} fill="#fff" stroke={PALETTE.teal} strokeWidth="2" />
          ))}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={M.top} y2={M.top + innerH} stroke={PALETTE.axis} strokeDasharray="3 3" />}
          {dates.map((d, i) => (
            <rect
              key={d}
              x={x(i) - innerW / Math.max(dates.length - 1, 1) / 2}
              y={M.top}
              width={innerW / Math.max(dates.length - 1, 1)}
              height={innerH}
              fill="transparent"
              tabIndex={0}
              aria-label={`${shortDate(d)}: ${format(current[i])}${previous.length ? `, previous period ${format(previous[i])}` : ""}`}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
            />
          ))}
        </svg>
      )}
      {hover !== null && width > 0 && (
        <div className="ca-tip" style={{ left: Math.min(Math.max(x(hover), 80), width - 80) }} role="status">
          <strong>{dates[hover] === todayYmd() ? "Today so far" : shortDate(dates[hover])}</strong>
          <span><i style={{ background: PALETTE.teal }} />{format(current[hover])} this period</span>
          {previous.length > 0 && <span><i style={{ background: PALETTE.prev }} />{format(previous[hover])} previous</span>}
        </div>
      )}
    </div>
  );
}

// Horizontal stacked bars: one row per day or week, parts in `series` order
export function StackedBars({ rows, series, labelWidth = 58 }) {
  const max = Math.max(1, ...rows.map((r) => series.reduce((n, s) => n + (r[s.key] || 0), 0)));
  return (
    <div className="ca-stack" style={{ "--ca-label": `${labelWidth}px` }}>
      {rows.map((r) => {
        const total = series.reduce((n, s) => n + (r[s.key] || 0), 0);
        return (
          <div className="ca-stack__row" key={r.label}>
            <span className="ca-stack__label">{r.label}</span>
            <span className="ca-stack__track" title={series.map((s) => `${s.label}: ${r[s.key] || 0}`).join(", ")}>
              <span className="ca-stack__bar" style={{ width: `${(total / max) * 100}%` }}>
                {series.map((s) => (r[s.key] ? <i key={s.key} style={{ flexGrow: r[s.key], background: s.color }} /> : null))}
              </span>
            </span>
            <span className="ca-stack__total">{total}</span>
          </div>
        );
      })}
    </div>
  );
}

// Period totals under a stacked chart: "669 given · 18 refused · …"
export function SeriesTotals({ rows, series }) {
  return (
    <ul className="ca-totals">
      {series.map((s) => (
        <li key={s.key}>
          <i style={{ background: s.color }} />
          <strong>{rows.reduce((n, r) => n + (r[s.key] || 0), 0)}</strong> {s.label.toLowerCase()}
        </li>
      ))}
    </ul>
  );
}

// One bar split by share, with a list underneath
export function SegmentBar({ parts, renderRow }) {
  const total = parts.reduce((n, p) => n + p.value, 0);
  return (
    <>
      <div className="ca-seg" aria-hidden="true">
        {total === 0 ? <i style={{ flexGrow: 1, background: PALETTE.grid }} /> : parts.map((p) => (p.value ? <i key={p.key} style={{ flexGrow: p.value, background: p.color }} /> : null))}
      </div>
      <ul className="ca-seg__list">
        {parts.map((p) => (
          <li key={p.key}>
            <span className="ca-seg__name">
              <i style={{ background: p.color }} />
              {p.icon && <HealthIcon name={p.icon} size={16} />}
              {p.label}
            </span>
            {renderRow ? renderRow(p, total) : <span className="ca-num">{p.value}</span>}
          </li>
        ))}
      </ul>
    </>
  );
}

// Tiny trend line for tables (percentages, gaps for null)
export function Sparkline({ values, width = 92, height = 26 }) {
  const pts = values.map((v, i) => [v, i]).filter(([v]) => v !== null && v !== undefined);
  if (pts.length < 2) return <span className="ca-muted">–</span>;
  const lo = Math.min(50, ...pts.map(([v]) => v));
  const x = (i) => 2 + (i / Math.max(values.length - 1, 1)) * (width - 4);
  const y = (v) => 2 + (1 - (v - lo) / (100 - lo || 1)) * (height - 4);
  const d = pts.map(([v, i], k) => `${k ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const [lv, li] = pts[pts.length - 1];
  return (
    <svg width={width} height={height} className="ca-spark" aria-hidden="true">
      <path d={d} fill="none" stroke={PALETTE.teal} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx={x(li)} cy={y(lv)} r="2.4" fill={PALETTE.teal} />
    </svg>
  );
}

// Ranked bars (e.g. entries per member of staff)
export function BarList({ items, format = (v) => v }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="ca-barlist">
      {items.map((i) => (
        <li key={i.label}>
          <span className="ca-barlist__top">
            <span>{i.label}</span>
            <span className="ca-num">{format(i.value)}</span>
          </span>
          <span className="ca-barlist__track">
            <i style={{ width: `${(i.value / max) * 100}%`, background: i.color || PALETTE.teal }} />
          </span>
          {i.sub && <small>{i.sub}</small>}
        </li>
      ))}
    </ul>
  );
}
