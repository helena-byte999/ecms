import React, { useEffect, useRef, useState } from "react";
import { formatMoney } from "components/ui/ListUI.js";

// Invoiced vs paid per billing month: grouped columns, one axis, legend,
// hover/focus tooltip per month, and a table view. Colours were checked for
// colour-blind separation (teal #0a9e94 / blue #2a78d6).
const SERIES = [
  { key: "invoiced", label: "Invoiced", color: "#0a9e94" },
  { key: "paid", label: "Paid", color: "#2a78d6" },
];
const H = 240;
const M = { top: 14, right: 8, bottom: 28, left: 56 };
const BAR = 24;
const GAP = 2;

const monthLabel = (ym, opts = { month: "short" }) =>
  new Date(ym + "-01T00:00:00").toLocaleDateString("en-GB", opts);

function compact(value) {
  return formatMoney(value).replace(/[\d,.]+/, (n) => {
    const v = Math.abs(value);
    if (v >= 1e6) return (value / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace(/\.0$/, "") + "M";
    if (v >= 1e3) return (value / 1e3).toFixed(v >= 1e4 ? 0 : 1).replace(/\.0$/, "") + "K";
    return String(Math.round(value));
  });
}

// Round axis: ~4 steps of 1 / 2 / 2.5 / 5 x 10^n, e.g. 0, 10K, 20K, 30K
function niceTicks(v) {
  if (v <= 0) return [0, 1];
  const raw = v / 4;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * p).find((s) => s >= raw);
  const top = Math.ceil(v / step) * step;
  const ticks = [];
  for (let t = 0; t <= top + step / 2; t += step) ticks.push(t);
  return ticks;
}

// Column with a 4px rounded top and a square base
function column(x, y, w, h) {
  const r = Math.min(4, h, w / 2);
  const b = y + h;
  return `M${x},${b}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${b}Z`;
}

function useWidth(ref) {
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

function InvoiceChart({ data = [] }) {
  const box = useRef(null);
  const width = useWidth(box);
  const [active, setActive] = useState(null);
  const [asTable, setAsTable] = useState(false);
  const empty = !data.some((d) => d.invoiced > 0);

  const innerW = Math.max(width - M.left - M.right, 0);
  const innerH = H - M.top - M.bottom;
  const ticks = niceTicks(Math.max(...data.map((d) => d.invoiced), 0));
  const max = ticks[ticks.length - 1];
  const y = (v) => M.top + innerH - (v / max) * innerH;
  const band = data.length ? innerW / data.length : 0;
  const barW = Math.max(Math.min(BAR, (band * 0.7 - GAP) / 2), 4);

  return (
    <div className="ecms-chart">
      <div className="ecms-chart__head">
        <div>
          <h3>Invoiced vs paid</h3>
          <p>By billing month, last {data.length} months</p>
        </div>
        <div className="ecms-chart__tools">
          <ul className="ecms-chart__legend" aria-label="Legend">
            {SERIES.map((s) => (
              <li key={s.key}>
                <span className="ecms-chart__swatch" style={{ background: s.color }} />
                {s.label}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="ecms-btn-ghost ecms-chart__toggle"
            aria-pressed={asTable}
            onClick={() => {
              setActive(null);
              setAsTable(!asTable);
            }}
          >
            {asTable ? "Chart" : "Table"}
          </button>
        </div>
      </div>

      {asTable && (
        <table className="table ecms-chart__table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Invoiced</th>
              <th>Paid</th>
              <th>Still unpaid</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.month}>
                <td>{monthLabel(d.month, { month: "long", year: "numeric" })}</td>
                <td className="ecms-amount">{formatMoney(d.invoiced)}</td>
                <td className="ecms-amount">{formatMoney(d.paid)}</td>
                <td className="ecms-amount">{formatMoney(d.invoiced - d.paid)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div
        className="ecms-chart__plot"
        ref={box}
        hidden={asTable}
        onMouseLeave={() => setActive(null)}
      >
          {empty && <p className="ecms-chart__empty">No invoices in this period yet.</p>}
          {width > 0 && (
            <svg width={width} height={H} role="img" aria-label="Invoiced and paid amounts by month. Use Table for the values.">
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} className="ecms-chart__grid" />
                  <text x={M.left - 8} y={y(t)} className="ecms-chart__tick" textAnchor="end" dominantBaseline="middle">
                    {compact(t)}
                  </text>
                </g>
              ))}
              {data.map((d, i) => {
                const cx = M.left + band * i + band / 2;
                const left = cx - barW - GAP / 2;
                const dim = active !== null && active !== i;
                return (
                  <g key={d.month} opacity={dim ? 0.45 : 1}>
                    {SERIES.map((s, k) => {
                      const v = d[s.key];
                      if (!v) return null;
                      const top = y(v);
                      return (
                        <path
                          key={s.key}
                          d={column(left + k * (barW + GAP), top, barW, M.top + innerH - top)}
                          fill={s.color}
                        />
                      );
                    })}
                    <text x={cx} y={H - 8} textAnchor="middle" className="ecms-chart__tick">
                      {monthLabel(d.month)}
                    </text>
                    <rect
                      x={M.left + band * i}
                      y={M.top}
                      width={band}
                      height={innerH + 4}
                      fill="transparent"
                      tabIndex={0}
                      aria-label={`${monthLabel(d.month, { month: "long", year: "numeric" })}: invoiced ${formatMoney(d.invoiced)}, paid ${formatMoney(d.paid)}`}
                      onMouseEnter={() => setActive(i)}
                      onMouseLeave={() => setActive(null)}
                      onFocus={() => setActive(i)}
                      onBlur={() => setActive(null)}
                      className="ecms-chart__hit"
                    />
                  </g>
                );
              })}
            </svg>
          )}
          {active !== null && data[active] && (
            <div
              className="ecms-chart__tip"
              style={{
                left: Math.min(Math.max(M.left + band * active + band / 2, 90), width - 90),
              }}
              role="status"
            >
              <strong>{monthLabel(data[active].month, { month: "long", year: "numeric" })}</strong>
              {SERIES.map((s) => (
                <span key={s.key}>
                  <i style={{ background: s.color }} />
                  <b>{formatMoney(data[active][s.key])}</b> {s.label.toLowerCase()}
                </span>
              ))}
              <span className="ecms-chart__tip-muted">
                {formatMoney(data[active].invoiced - data[active].paid)} still unpaid
              </span>
            </div>
          )}
      </div>
    </div>
  );
}

export default InvoiceChart;
