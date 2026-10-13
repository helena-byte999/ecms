import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { FiDownload } from "react-icons/fi";
import { care } from "data/api";
import { formatDate } from "components/ui/ListUI.js";
import { Pill } from "components/care/CareTimeline.js";
import { INCIDENTS, SEVERITY, daysAgo, timeOf, ymd } from "components/care/labels.js";
import { reportCsv, reportPdf } from "components/care/careExport.js";
import "components/care/care.css";

const PRESETS = { 7: "Last 7 days", 30: "Last 30 days", 90: "Last 90 days" };

// Home overview for admins: doses, incidents and visits per resident, and who recorded what
function CareReports() {
  const [range, setRange] = useState({ from: daysAgo(6), to: ymd() });
  const [r, setR] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setR(null);
    setError("");
    axios
      .get(care.report, { params: range })
      .then((res) => setR(res.data.data))
      .catch((err) => setError(err.response?.data?.msg || "Couldn't load the report."));
  }, [range]);

  const t = r?.totals;
  return (
    <div className="content">
      <div className="care-card">
        <div className="care-card__head">
          <h2>Care reports</h2>
          {r && (
            <div className="care-actions">
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
                <FiDownload aria-hidden="true" /> {busy ? "Preparing…" : "Download PDF"}
              </button>
              <button type="button" className="care-btn" onClick={() => reportCsv(r)}>
                <FiDownload aria-hidden="true" /> CSV
              </button>
            </div>
          )}
        </div>
        <div className="care-card__body">
          <div className="care-range" style={{ marginBottom: 18 }}>
            {Object.entries(PRESETS).map(([n, label]) => (
              <button
                key={n}
                type="button"
                className={"care-btn care-btn--sm" + (range.from === daysAgo(n - 1) && range.to === ymd() ? " care-btn--primary" : "")}
                onClick={() => setRange({ from: daysAgo(n - 1), to: ymd() })}
              >
                {label}
              </button>
            ))}
            <label className="care-muted" htmlFor="rep-from" style={{ marginLeft: 8 }}>From</label>
            <input id="rep-from" type="date" max={range.to} value={range.from} onChange={(e) => e.target.value && setRange({ ...range, from: e.target.value })} />
            <label className="care-muted" htmlFor="rep-to">to</label>
            <input id="rep-to" type="date" min={range.from} max={ymd()} value={range.to} onChange={(e) => e.target.value && setRange({ ...range, to: e.target.value })} />
          </div>
          {error && <p className="care-error">{error}</p>}
          {!r && !error && <p className="care-empty">Loading report…</p>}
          {r && (
            <>
              <div className="care-figures">
                <div className="care-figure">
                  <small>Doses given</small>
                  <strong>{t.completion === null ? "–" : `${t.completion}%`}</strong>
                  <span>{t.given} of {t.scheduled - t.due}</span>
                </div>
                <div className="care-figure">
                  <small>Refused</small>
                  <strong>{t.refused}</strong>
                  <span>{t.missed} missed</span>
                </div>
                <div className="care-figure">
                  <small>Not recorded</small>
                  <strong>{t.not_recorded}</strong>
                  <span>{t.due} due now</span>
                </div>
                <div className="care-figure">
                  <small>Incidents</small>
                  <strong>{t.incidents}</strong>
                  <span>{t.visits} doctor's visit{t.visits === 1 ? "" : "s"}</span>
                </div>
                <div className="care-figure">
                  <small>Care entries</small>
                  <strong>{t.entries}</strong>
                  <span>by {r.caregivers.length} staff</span>
                </div>
              </div>

              <div className="care-section" style={{ marginTop: 22 }}>
                <h3>By resident</h3>
                <div className="care-scroll">
                  <table className="care-meds">
                    <thead>
                      <tr>
                        <th>Resident</th>
                        <th className="care-num">Given</th>
                        <th className="care-num">Refused</th>
                        <th className="care-num">Missed</th>
                        <th className="care-num">Not recorded</th>
                        <th className="care-num">Incidents</th>
                        <th className="care-num">Visits</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.residents.map((x) => (
                        <tr key={x._id}>
                          <td>
                            <Link to={`/admin/care/${x._id}`}><strong>{x.name}</strong></Link>
                          </td>
                          <td className="care-num">
                            {x.completion === null ? "–" : (
                              <Pill tone={x.completion >= 95 ? "ok" : x.completion >= 85 ? "warn" : "bad"} plain>
                                {x.completion}%
                              </Pill>
                            )}
                            <span className="care-muted">{x.given} of {x.scheduled - x.due}</span>
                          </td>
                          <td className="care-num">{x.refused}</td>
                          <td className="care-num">{x.missed}</td>
                          <td className="care-num">{x.not_recorded}</td>
                          <td className="care-num">{x.incidents}</td>
                          <td className="care-num">{x.visits}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="care-section">
                <h3>Incidents</h3>
                {r.incidents.length === 0 ? (
                  <p className="care-muted">None in this period.</p>
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
              </div>

              <div className="care-section">
                <h3>Entries by staff</h3>
                <div className="care-scroll">
                  <table className="care-meds">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th className="care-num">Entries</th>
                        <th className="care-num">Doses recorded</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.caregivers.map((c) => (
                        <tr key={c.name}>
                          <td><strong>{c.name}</strong> <span className="care-muted">{c.role}</span></td>
                          <td className="care-num">{c.entries}</td>
                          <td className="care-num">{c.doses}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CareReports;
