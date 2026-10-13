import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Link, useLocation, useParams } from "react-router-dom";
import { FiArrowLeft, FiDownload, FiPlus } from "react-icons/fi";
import HealthIcon from "components/HealthIcon.js";
import { care } from "data/api";
import { useAuth } from "contexts/AuthContext";
import { Avatar, formatDate } from "components/ui/ListUI.js";
import CareTimeline, { Pill } from "components/care/CareTimeline.js";
import { DoseDialog, EntryDialog, MedicineDialog, StopMedicineDialog, VisitDialog } from "components/care/dialogs.js";
import { ENTRY_TYPES, EATEN, MOODS, INCIDENTS, SEVERITY, age, daysAgo, fullName, timeOf, ymd } from "components/care/labels.js";
import { summaryCsv, summaryPdf } from "components/care/careExport.js";
import { useSubject } from "components/care/useSubject.js";

const RANGES = { 7: "Last 7 days", 30: "Last 30 days", 90: "Last 90 days" };

function Medicines({ meds, staff, onStop }) {
  const [showStopped, setShowStopped] = useState(false);
  if (!meds) return <p className="care-empty">Loading medicines…</p>;
  return (
    <>
      <div className="care-scroll">
        <table className="care-meds">
          <thead>
            <tr>
              <th>Medicine</th>
              <th>When</th>
              <th>Reason</th>
              <th>Since</th>
              {staff && <th aria-label="Actions" />}
            </tr>
          </thead>
          <tbody>
            {meds.active.length === 0 && (
              <tr>
                <td colSpan={5} className="care-empty">No current medicines.</td>
              </tr>
            )}
            {meds.active.map((m) => (
              <tr key={m._id}>
                <td>
                  <strong>{m.name} {m.dose}</strong>
                  {m.instructions && <span className="care-muted">{m.instructions}</span>}
                </td>
                <td>{m.as_needed ? "As needed" : m.times.join(", ")}</td>
                <td>
                  {m.reason || "–"}
                  {m.visit && <span className="care-muted">From a doctor's visit</span>}
                </td>
                <td>
                  {formatDate(m.start_date)}
                  {m.end_date && <span className="care-muted">Until {formatDate(m.end_date)}</span>}
                </td>
                {staff && (
                  <td className="care-num">
                    <button type="button" className="care-link" onClick={() => onStop(m)}>
                      Stop
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {meds.stopped.length > 0 && (
        <div className="care-section" style={{ marginTop: 18 }}>
          <button type="button" className="care-link" aria-expanded={showStopped} onClick={() => setShowStopped(!showStopped)}>
            {showStopped ? "Hide" : "Show"} stopped medicines ({meds.stopped.length})
          </button>
          {showStopped && (
            <ul className="care-list" style={{ marginTop: 8 }}>
              {meds.stopped.map((m) => (
                <li key={m._id}>
                  <strong>{m.name} {m.dose}</strong>: stopped {formatDate(m.stopped_at)} by {m.stopped_by?.name || "staff"}
                  {m.stop_reason && <span className="care-muted">{m.stop_reason}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

function Summary({ residentId }) {
  const [range, setRange] = useState({ from: daysAgo(6), to: ymd() });
  const [s, setS] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setS(null);
    setError("");
    axios
      .get(`${care.resident}/${residentId}/summary`, { params: range })
      .then((r) => setS(r.data.data))
      .catch((err) => setError(err.response?.data?.msg || "Couldn't load the summary."));
  }, [residentId, range]);

  return (
    <>
      <div className="care-toolbar" style={{ padding: 0, marginBottom: 16 }}>
        <div className="care-range">
          <label className="care-muted" htmlFor="sum-from">From</label>
          <input id="sum-from" type="date" max={range.to} value={range.from} onChange={(e) => e.target.value && setRange({ ...range, from: e.target.value })} />
          <label className="care-muted" htmlFor="sum-to">to</label>
          <input id="sum-to" type="date" min={range.from} max={ymd()} value={range.to} onChange={(e) => e.target.value && setRange({ ...range, to: e.target.value })} />
        </div>
        {s && (
          <div className="care-actions">
            <button
              type="button"
              className="care-btn"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await summaryPdf(s);
                setBusy(false);
              }}
            >
              <FiDownload aria-hidden="true" /> {busy ? "Preparing…" : "PDF"}
            </button>
            <button type="button" className="care-btn" onClick={() => summaryCsv(s)}>
              <FiDownload aria-hidden="true" /> CSV
            </button>
          </div>
        )}
      </div>
      {error && <p className="care-error">{error}</p>}
      {!s && !error && <p className="care-empty">Loading summary…</p>}
      {s && (
        <>
          <div className="care-figures">
            <div className="care-figure">
              <small>Doses given</small>
              <strong>{s.doses.completion === null ? "–" : `${s.doses.completion}%`}</strong>
              <span>{s.doses.given} of {s.doses.scheduled - s.doses.due}</span>
            </div>
            <div className="care-figure">
              <small>Refused</small>
              <strong>{s.doses.refused}</strong>
              <span>{s.doses.missed} missed, {s.doses.not_recorded} not recorded</span>
            </div>
            <div className="care-figure">
              <small>Incidents</small>
              <strong>{s.incidents.length}</strong>
              <span>{s.visits.length} doctor's visit{s.visits.length === 1 ? "" : "s"}</span>
            </div>
            <div className="care-figure">
              <small>Days unwell</small>
              <strong>{s.wellbeing.days_unwell}</strong>
              <span>Highest {s.wellbeing.max_temperature ? `${s.wellbeing.max_temperature} °C` : "–"}</span>
            </div>
            <div className="care-figure">
              <small>Drinks a day</small>
              <strong>{s.meals.drink_ml_per_day ? `${s.meals.drink_ml_per_day} ml` : "–"}</strong>
              <span>{s.meals.recorded} meals recorded</span>
            </div>
          </div>

          <div className="care-section" style={{ marginTop: 22 }}>
            <h3>Medicines</h3>
            <div className="care-scroll">
              <table className="care-meds">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th className="care-num">Given</th>
                    <th className="care-num">Refused</th>
                    <th className="care-num">Missed</th>
                    <th className="care-num">Not recorded</th>
                  </tr>
                </thead>
                <tbody>
                  {s.medicines.map((m) => (
                    <tr key={m._id}>
                      <td>
                        <strong>{m.name} {m.dose}</strong>
                        <span className="care-muted">
                          {m.as_needed ? `As needed: given ${m.as_needed_given} time${m.as_needed_given === 1 ? "" : "s"}` : m.times.join(", ")}
                          {m.status === "stopped" ? " · stopped" : ""}
                        </span>
                      </td>
                      <td className="care-num">{m.as_needed ? "–" : m.given}</td>
                      <td className="care-num">{m.as_needed ? "–" : m.refused}</td>
                      <td className="care-num">{m.as_needed ? "–" : m.missed}</td>
                      <td className="care-num">{m.as_needed ? "–" : m.not_recorded}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {s.changes.length > 0 && (
            <div className="care-section">
              <h3>Medicine changes</h3>
              <ul className="care-list">
                {s.changes.map((c, i) => (
                  <li key={i}>
                    <strong>{c.kind === "started" ? "Started" : "Stopped"} {c.name} {c.dose}</strong> on {formatDate(c.at)}
                    {c.reason && <span className="care-muted">{c.reason}{c.by ? ` · ${c.by}` : ""}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="care-section">
            <h3>Doctor's visits</h3>
            {s.visits.length === 0 ? (
              <p className="care-muted">None in this period.</p>
            ) : (
              <ul className="care-list">
                {s.visits.map((v) => (
                  <li key={v._id}>
                    <strong>{v.professional}</strong>, {formatDate(v.at)}: {v.reason}
                    <span className="care-muted">{v.outcome}{v.follow_up ? ` Follow-up: ${v.follow_up}` : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="care-section">
            <h3>Incidents</h3>
            {s.incidents.length === 0 ? (
              <p className="care-muted">None in this period.</p>
            ) : (
              <ul className="care-list">
                {s.incidents.map((i) => (
                  <li key={i._id}>
                    <strong>{INCIDENTS[i.kind]}</strong> ({SEVERITY[i.severity]?.toLowerCase()}), {formatDate(i.at)} {timeOf(i.at)}: {i.note}
                    {i.action && <span className="care-muted">Action: {i.action}{i.family_informed ? " · Family informed" : ""}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="care-section">
            <h3>Wellbeing and meals</h3>
            <p className="care-muted" style={{ fontSize: 14 }}>
              {Object.keys(s.wellbeing.moods).length
                ? `Moods: ${Object.entries(s.wellbeing.moods).map(([m, n]) => `${MOODS[m] || m} ${n}`).join(", ")}. `
                : ""}
              {Object.keys(s.meals.eaten).length
                ? `Meals: ${Object.entries(s.meals.eaten).map(([k, n]) => `${(EATEN[k] || k).toLowerCase()} ${n}`).join(", ")}.`
                : ""}
            </p>
            <p className="care-muted" style={{ fontSize: 14 }}>
              {s.entries.total} entries by {s.entries.by_author.map((a) => `${a.name} (${a.count})`).join(", ") || "nobody"}.
            </p>
          </div>
        </>
      )}
    </>
  );
}

// One resident's care record. Staff reach it as /<role>/care/:id; residents and
// family members see their own (or their relative's) at /<role>/care.
function ResidentCare() {
  const params = useParams();
  const location = useLocation();
  const { userDetail } = useAuth();
  const subject = useSubject();
  const layout = "/" + location.pathname.split("/")[1];
  const staff = userDetail.role === "admin" || userDetail.role === "caregiver";
  const residentId = staff ? params.id : subject.id;
  const canSummarise = userDetail.role !== "caregiver";

  const [tab, setTab] = useState("log");
  const [days, setDays] = useState(7);
  const [type, setType] = useState("");
  const [log, setLog] = useState(null);
  const [resident, setResident] = useState(null);
  const [meds, setMeds] = useState(null);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState(null); // { kind, ... }

  const loadLog = useCallback(() => {
    if (!residentId) return;
    axios
      .get(`${care.resident}/${residentId}/entries`, { params: { from: daysAgo(days - 1), to: ymd(), type: type || undefined } })
      .then((r) => {
        setLog(r.data.data);
        setResident(r.data.resident);
      })
      .catch((err) => setError(err.response?.data?.msg || "Couldn't load the care log."));
  }, [residentId, days, type]);
  const loadMeds = useCallback(() => {
    if (!residentId) return;
    axios.get(`${care.resident}/${residentId}/medications`).then((r) => {
      setMeds(r.data);
      setResident(r.data.resident);
    });
  }, [residentId]);
  useEffect(loadLog, [loadLog]);
  useEffect(loadMeds, [loadMeds]);
  const refresh = () => {
    loadLog();
    loadMeds();
  };

  function correct(entry) {
    if (entry.type === "dose") {
      setDialog({
        kind: "dose",
        slot: {
          resident: { _id: residentId, name: fullName(resident) },
          medication: { _id: entry.dose.medication, name: entry.dose.name, dose: entry.dose.dose },
          time: entry.dose.time,
          date: entry.dose.date,
          entry,
          outcome: entry.dose.outcome,
        },
      });
    } else setDialog({ kind: "entry", correcting: entry });
  }

  if (error && !resident) return <div className="content"><p className="care-empty">{error}</p></div>;

  const a = resident && age(resident.dob);
  return (
    <div className="content">
      {staff && (
        <Link className="care-back" to={`${layout}/care?tab=residents`}>
          <FiArrowLeft aria-hidden="true" /> All residents
        </Link>
      )}
      <div className="care-card">
        <div className="care-header">
          <div className="care-header__who">
            {resident && <Avatar name={fullName(resident)} />}
            <div>
              <h2>{resident ? fullName(resident) : "Loading…"}</h2>
              {resident && (
                <div className="care-header__facts">
                  {a !== null && <span>Age {a}</span>}
                  {resident.conditions && <span>{resident.conditions}</span>}
                  {resident.allergy && <span className="care-allergy">Allergy: {resident.allergy}</span>}
                </div>
              )}
            </div>
          </div>
          {staff && resident && (
            <div className="care-actions">
              <button type="button" className="care-btn care-btn--primary" onClick={() => setDialog({ kind: "entry" })}>
                <FiPlus aria-hidden="true" /> Add entry
              </button>
              <button type="button" className="care-btn" onClick={() => setDialog({ kind: "visit" })}>
                <HealthIcon name="stethoscope" size={18} /> Doctor's visit
              </button>
              <button type="button" className="care-btn" onClick={() => setDialog({ kind: "medicine" })}>
                <HealthIcon name="medicines" size={18} /> Medicine
              </button>
            </div>
          )}
        </div>
        <div className="care-toolbar">
          <div className="ecms-tabs" role="tablist" aria-label="Care record" style={{ margin: 0 }}>
            {[["log", "Care log"], ["meds", `Medicines${meds ? ` (${meds.active.length})` : ""}`], ...(canSummarise ? [["summary", "Summary and reports"]] : [])].map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} className={"ecms-tab" + (tab === k ? " is-active" : "")} onClick={() => setTab(k)}>
                {label}
              </button>
            ))}
          </div>
          {tab === "log" && (
            <div className="care-actions">
              <select className="care-select" aria-label="Type of entry" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">All entries</option>
                {Object.entries(ENTRY_TYPES).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
              <select className="care-select" aria-label="Period" value={days} onChange={(e) => setDays(Number(e.target.value))}>
                {Object.entries(RANGES).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="care-card__body" style={{ paddingTop: 20 }}>
          {tab === "log" && (log ? <CareTimeline entries={log} onCorrect={staff ? correct : undefined} /> : <p className="care-empty">Loading care log…</p>)}
          {tab === "meds" && <Medicines meds={meds} staff={staff} onStop={(m) => setDialog({ kind: "stop", medication: m })} />}
          {tab === "summary" && canSummarise && <Summary residentId={residentId} />}
          {!staff && tab === "log" && (
            <p className="care-muted" style={{ marginTop: 18 }}>
              Written by the care team. <Pill tone="neutral" plain>Read only</Pill>
            </p>
          )}
        </div>
      </div>

      {resident && (
        <>
          <EntryDialog open={dialog?.kind === "entry"} onClose={() => setDialog(null)} resident={resident} correcting={dialog?.correcting} onSaved={refresh} />
          <DoseDialog open={dialog?.kind === "dose"} slot={dialog?.slot} onClose={() => setDialog(null)} onSaved={refresh} />
          <MedicineDialog open={dialog?.kind === "medicine"} onClose={() => setDialog(null)} resident={resident} onSaved={refresh} />
          <StopMedicineDialog open={dialog?.kind === "stop"} onClose={() => setDialog(null)} resident={resident} medication={dialog?.medication} onSaved={refresh} />
          <VisitDialog open={dialog?.kind === "visit"} onClose={() => setDialog(null)} resident={resident} medicines={meds?.active || []} onSaved={refresh} />
        </>
      )}
    </div>
  );
}

export default ResidentCare;
