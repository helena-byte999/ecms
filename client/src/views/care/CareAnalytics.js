import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { FiDownload } from "react-icons/fi";
import { care } from "data/api";
import { formatDate } from "components/ui/ListUI.js";
import { MOOD_ICONS, Pill } from "components/care/CareTimeline.js";
import { INCIDENTS, MOODS, SEVERITY, daysAgo, timeOf, ymd } from "components/care/labels.js";
import { reportCsv, reportPdf } from "components/care/careExport.js";
import { BarList, ChartCard, Delta, KpiStrip, SegmentBar, SeriesTotals, Sparkline, StackedBars, TrendChart, fmtPct } from "components/care/charts.js";
import { INCIDENT_COLORS, MOOD_COLORS, OUTCOME_SERIES, PALETTE } from "components/care/palette.js";
import SectionTabs, { careTabs } from "components/ui/SectionTabs.js";

const PRESETS = [[7, "7 days"], [30, "30 days"], [90, "90 days"]];
const dayLabel = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric" });
// "14–20 Sept", or "28 Sept – 4 Oct" across months
function rangeLabel(a, b) {
  const da = new Date(a + "T12:00:00");
  const db = new Date(b + "T12:00:00");
  const month = (d) => d.toLocaleDateString("en-GB", { month: "short" });
  if (a === b) return `${da.getDate()} ${month(da)}`;
  return da.getMonth() === db.getMonth() ? `${da.getDate()}–${db.getDate()} ${month(db)}` : `${da.getDate()} ${month(da)} – ${db.getDate()} ${month(db)}`;
}

// Days for a short period, weeks (counted back from the last day) for a long one
function outcomeRows(daily) {
  if (daily.length <= 14) return daily.map((d) => ({ ...d, label: dayLabel(d.date) }));
  const rows = [];
  for (let end = daily.length; end > 0; end -= 7) {
    const chunk = daily.slice(Math.max(0, end - 7), end);
    const row = { label: rangeLabel(chunk[0].date, chunk[chunk.length - 1].date) };
    for (const s of OUTCOME_SERIES) row[s.key] = chunk.reduce((n, d) => n + d[s.key], 0);
    rows.unshift(row);
  }
  return rows;
}

// How each resident is doing: lowest completion (then most incidents) first
const attention = (r) => (r.completion ?? 101) * 10 - r.incidents * 3 - r.unwell_days;

export function careHeadline(r) {
  if (!r) return null;
  const t = r.totals;
  const p = r.previous.totals;
  const diff = t.completion_exact !== null && p.completion !== null ? Math.round((t.completion_exact - p.completion) * 10) / 10 : null;
  return (
    <>
      In the last {r.days} days, <strong>{fmtPct(t.completion_exact)}</strong> of doses were given
      {diff !== null && diff !== 0 ? ` (${diff > 0 ? "up" : "down"} ${Math.abs(diff).toFixed(1)} points)` : ""},{" "}
      <strong>{t.incidents} incident{t.incidents === 1 ? "" : "s"}</strong> {t.incidents === 1 ? "was" : "were"} recorded and{" "}
      <strong>{t.residents_unwell} resident{t.residents_unwell === 1 ? "" : "s"}</strong> {t.residents_unwell === 1 ? "was" : "were"} unwell.
      {t.due > 0 && <> Right now <strong>{t.due} dose{t.due === 1 ? "" : "s"}</strong> {t.due === 1 ? "is" : "are"} due on the round.</>}
    </>
  );
}

// Care analytics for admins: this period against the previous one
function CareAnalytics() {
  const [days, setDays] = useState(30);
  const [range, setRange] = useState({ from: daysAgo(29), to: ymd() });
  const [r, setR] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setError("");
    axios
      .get(care.report, { params: range })
      .then((res) => setR(res.data.data))
      .catch((err) => setError(err.response?.data?.msg || "Couldn't load the analytics."));
  }, [range]);
  const pickPreset = (n) => {
    setDays(n);
    setRange({ from: daysAgo(n - 1), to: ymd() });
  };
  const setCustom = (change) => {
    if (Object.values(change).some((v) => !v)) return;
    setDays(null);
    setRange((cur) => ({ ...cur, ...change }));
  };

  const residents = useMemo(() => (r ? [...r.residents].sort((a, b) => attention(a) - attention(b)) : []), [r]);
  const t = r?.totals;
  const p = r?.previous.totals;

  return (
    <div className="content">
      <SectionTabs label="Care" tabs={careTabs("/admin", true)} />
      <div className="ca-head">
        <div>
          <h2>Care analytics</h2>
          <p>{r ? careHeadline(r) : "Loading…"}</p>
        </div>
        <div className="ca-range">
          <div className="ecms-tabs" role="tablist" aria-label="Period">
            {PRESETS.map(([n, label]) => (
              <button key={n} type="button" role="tab" aria-selected={days === n} className={"ecms-tab" + (days === n ? " is-active" : "")} onClick={() => pickPreset(n)}>
                {label}
              </button>
            ))}
          </div>
          <div className="care-range" role="group" aria-label="Custom period">
            <input type="date" aria-label="From" max={range.to} value={range.from} onChange={(e) => setCustom({ from: e.target.value })} />
            <span className="ca-muted">to</span>
            <input type="date" aria-label="To" min={range.from} max={ymd()} value={range.to} onChange={(e) => setCustom({ to: e.target.value })} />
          </div>
          {r && (
            <>
              <button
                type="button"
                className="care-btn"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await reportPdf(r);
                  setBusy(false);
                }}
              >
                <FiDownload aria-hidden="true" /> {busy ? "Preparing…" : "PDF"}
              </button>
              <button type="button" className="care-btn" onClick={() => reportCsv(r)}>
                <FiDownload aria-hidden="true" /> CSV
              </button>
            </>
          )}
        </div>
      </div>
      {error && <p className="care-error">{error}</p>}
      {!r && !error && <p className="care-empty">Loading analytics…</p>}

      {r && (
        <>
          <KpiStrip
            items={[
              {
                icon: "medicines",
                label: "Doses given",
                sub: `${fmtPct(p.completion)} previous ${r.days} days`,
                value: fmtPct(t.completion_exact),
                delta: <Delta now={t.completion_exact} before={p.completion} />,
              },
              {
                icon: "schedule",
                label: "Recorded on time",
                sub: `${fmtPct(p.on_time_rate)} previous ${r.days} days`,
                value: fmtPct(t.on_time_rate),
                delta: <Delta now={t.on_time_rate} before={p.on_time_rate} />,
              },
              {
                icon: "refused",
                label: "Refused or missed",
                sub: `${p.refused + p.missed} previous ${r.days} days`,
                value: t.refused + t.missed,
                delta: <Delta now={t.refused + t.missed} before={p.refused + p.missed} unit="count" goodWhen="down" />,
              },
              {
                icon: "alert",
                label: "Incidents",
                sub: `${p.incidents} previous ${r.days} days`,
                value: t.incidents,
                delta: <Delta now={t.incidents} before={p.incidents} unit="count" goodWhen="down" />,
              },
              {
                icon: "thermometer",
                label: "Days unwell",
                sub: `${p.unwell_days} previous ${r.days} days`,
                value: t.unwell_days,
                delta: <Delta now={t.unwell_days} before={p.unwell_days} unit="count" goodWhen="down" />,
              },
            ]}
          />

          <div className="ca-grid ca-grid--2-1">
            <ChartCard
              icon="chartLine"
              title="Doses given"
              sub="Share of doses due each day that were given"
              legend={[{ label: "This period", color: PALETTE.teal }, { label: "Previous period", color: PALETTE.prev, dashed: true }]}
            >
              <div className="ca-big">
                <strong>{fmtPct(t.completion_exact)}</strong>
                <span>{t.given} of {t.scheduled - t.due} doses</span>
              </div>
              <TrendChart
                dates={r.daily.map((d) => d.date)}
                current={r.daily.map((d) => d.completion)}
                previous={r.previous.daily.map((d) => d.completion)}
                ariaLabel={`Doses given each day, ${formatDate(r.from)} to ${formatDate(r.to)}, compared with the previous period`}
              />
            </ChartCard>
            <ChartCard icon="chartBar" title="Doses by outcome" sub={r.days <= 14 ? "By day" : "By week, latest last"} legend={OUTCOME_SERIES}>
              <StackedBars rows={outcomeRows(r.daily)} series={OUTCOME_SERIES} labelWidth={r.days <= 14 ? 58 : 96} />
              <SeriesTotals rows={r.daily} series={OUTCOME_SERIES} />
            </ChartCard>
          </div>

          <div className="ca-grid ca-grid--3">
            <ChartCard icon="alert" title="Incidents" sub={`${t.incidents} this period, ${p.incidents} before`}>
              <SegmentBar
                parts={r.incidents_by_kind.map((k) => ({ key: k.kind, label: INCIDENTS[k.kind] || k.kind, value: k.count, previous: k.previous, color: INCIDENT_COLORS[k.kind] || PALETTE.prev }))}
                renderRow={(part) => (
                  <span className="care-actions" style={{ alignItems: "center" }}>
                    <span className="ca-num">{part.value}</span>
                    <Delta now={part.value} before={part.previous} unit="count" goodWhen="down" label="" />
                  </span>
                )}
              />
              {r.incidents_by_kind.length === 0 && <p className="ca-muted">No incidents in either period.</p>}
            </ChartCard>
            <ChartCard icon="heartbeat" title="Mood" sub={`${Object.values(r.moods).reduce((a, b) => a + b, 0)} wellbeing checks`}>
              <SegmentBar
                parts={Object.keys(MOODS)
                  .filter((m) => r.moods[m])
                  .map((m) => ({ key: m, label: MOODS[m], value: r.moods[m], color: MOOD_COLORS[m], icon: MOOD_ICONS[m] }))}
                renderRow={(part, total) => (
                  <span>
                    <span className="ca-num">{Math.round((part.value / total) * 100)}%</span> <span className="ca-muted">({part.value})</span>
                  </span>
                )}
              />
            </ChartCard>
            <ChartCard icon="medicines" title="Refusals by medicine" sub="Refused or missed doses; worth raising at a medication review">
              {r.medicines.some((m) => m.refused + m.missed > 0) ? (
                <BarList
                  items={r.medicines
                    .filter((m) => m.refused + m.missed > 0)
                    .slice(0, 6)
                    .map((m) => ({
                      label: m.name,
                      value: m.refused + m.missed,
                      color: PALETTE.amber,
                      sub: `${m.refused} refused, ${m.missed} missed · ${fmtPct(m.completion)} given · ${m.residents} resident${m.residents === 1 ? "" : "s"}`,
                    }))}
                />
              ) : (
                <p className="ca-muted">No refused or missed doses in this period.</p>
              )}
            </ChartCard>
          </div>

          <ChartCard icon="elderly" title="Residents" sub="Lowest dose completion first">
            <div className="care-scroll">
              <table className="ca-table">
                <thead>
                  <tr>
                    <th>Resident</th>
                    <th>Doses given</th>
                    <th>Trend</th>
                    <th className="ca-num">On time</th>
                    <th className="ca-num">Refused</th>
                    <th className="ca-num">Missed</th>
                    <th className="ca-num">Not recorded</th>
                    <th className="ca-num">Incidents</th>
                    <th className="ca-num">Days unwell</th>
                  </tr>
                </thead>
                <tbody>
                  {residents.map((x) => (
                    <tr key={x._id}>
                      <td>
                        <Link to={`/admin/care/${x._id}`}>{x.name}</Link>
                        {(x.completion !== null && x.completion < 85) || x.incidents > 1 ? (
                          <span className="ca-flag"><Pill tone="warn" plain>Check</Pill></span>
                        ) : null}
                      </td>
                      <td>
                        {x.completion === null ? "–" : (
                          <Pill tone={x.completion >= 95 ? "ok" : x.completion >= 85 ? "warn" : "bad"} plain>{x.completion}%</Pill>
                        )}{" "}
                        <span className="ca-muted">{x.given}/{x.scheduled - x.due}</span>
                      </td>
                      <td><Sparkline values={x.trend} /></td>
                      <td className="ca-num">{fmtPct(x.on_time_rate)}</td>
                      <td className="ca-num">{x.refused}</td>
                      <td className="ca-num">{x.missed}</td>
                      <td className="ca-num">{x.not_recorded}</td>
                      <td className="ca-num">{x.incidents}</td>
                      <td className="ca-num">{x.unwell_days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>

          <ChartCard icon="alert" title="Incident log" sub={`${r.incidents.length} in this period`}>
            {r.incidents.length === 0 ? (
              <p className="ca-muted">None in this period.</p>
            ) : (
              <ul className="care-list">
                {r.incidents.map((i) => (
                  <li key={i._id}>
                    <strong>{i.resident}</strong>: {INCIDENTS[i.kind]} ({SEVERITY[i.severity]?.toLowerCase()}), {formatDate(i.at)} {timeOf(i.at)}
                    <span className="care-muted">{i.note}{i.action ? ` Action: ${i.action}` : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </ChartCard>
        </>
      )}
    </div>
  );
}

export default CareAnalytics;
