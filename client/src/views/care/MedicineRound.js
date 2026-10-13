import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { care } from "data/api";
import { DOSE, timeOf } from "components/care/labels.js";
import { Pill } from "components/care/CareTimeline.js";
import { DoseDialog } from "components/care/dialogs.js";

const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const OPEN = ["due", "late"];

// Today's medicine round: every scheduled dose across the home, grouped by time
function MedicineRound({ layout, onChange }) {
  const [round, setRound] = useState(null);
  const [error, setError] = useState("");
  const [view, setView] = useState("todo");
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(() => {
    axios
      .get(care.round)
      .then((r) => setRound(r.data.data))
      .catch(() => setError("Couldn't load today's round. Please refresh."));
  }, []);
  useEffect(load, [load]);

  async function quickGive(slot) {
    setBusy(slot.medication._id + slot.time);
    try {
      await axios.post(`${care.resident}/${slot.resident._id}/entries`, {
        type: "dose",
        dose: { medication: slot.medication._id, time: slot.time, date: slot.date, outcome: "given" },
      });
      load();
      onChange && onChange();
    } catch (err) {
      setError(err.response?.data?.msg || "Couldn't record that dose.");
    }
    setBusy(null);
  }

  if (error && !round) return <p className="care-empty">{error}</p>;
  if (!round) return <p className="care-empty">Loading today's round…</p>;

  const nowMin = toMin(round.now);
  // doses can be given up to an hour early
  const canGive = (s) => OPEN.includes(s.status) || (s.status === "upcoming" && toMin(s.time) - nowMin <= 60);
  const t = round.totals;
  const done = t.given + t.refused + t.missed;
  const expected = t.scheduled;
  const late = round.slots.filter((s) => s.status === "late").length;
  const shown = round.slots.filter((s) =>
    view === "todo" ? OPEN.includes(s.status) || (s.status === "upcoming" && canGive(s)) : view === "done" ? !!s.entry : true,
  );
  const groups = [];
  for (const s of shown) {
    if (!groups.length || groups[groups.length - 1].time !== s.time) groups.push({ time: s.time, slots: [] });
    groups[groups.length - 1].slots.push(s);
  }

  return (
    <>
      <div className="care-progress" style={{ marginBottom: 16 }}>
        <span>
          <strong>{done}</strong> of {expected} doses due so far recorded
        </span>
        <span className="care-progress__bar" aria-hidden="true">
          <i style={{ width: expected ? `${Math.round((done / expected) * 100)}%` : "0%" }} />
        </span>
        {late > 0 && <Pill tone="bad">{late} late</Pill>}
        {t.refused > 0 && <Pill tone="warn">{t.refused} refused</Pill>}
      </div>
      <div className="care-toolbar" style={{ padding: 0, marginBottom: 14 }}>
        <div className="ecms-tabs" role="tablist" aria-label="Show doses" style={{ margin: 0 }}>
          {[["todo", "To do"], ["done", "Recorded"], ["all", "All today"]].map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={view === k} className={"ecms-tab" + (view === k ? " is-active" : "")} onClick={() => setView(k)}>
              {label}
            </button>
          ))}
        </div>
        <span className="care-muted">Updated {round.now}</span>
      </div>
      {error && <div className="care-error" role="alert" style={{ marginBottom: 12 }}>{error}</div>}

      {groups.length === 0 && (
        <p className="care-empty">{view === "todo" ? "Nothing due right now. Well done." : "No doses to show."}</p>
      )}
      {groups.map((g) => (
        <section className="care-slot-group" key={g.time}>
          <h4>
            {g.time}
            {toMin(g.time) > nowMin && <Pill tone="muted" plain>Later today</Pill>}
          </h4>
          {g.slots.map((s) => {
            const [label, tone] = DOSE[s.status] || [s.status, "muted"];
            const key = s.medication._id + s.time;
            return (
              <div key={key} className={"care-slot" + (s.status === "late" ? " care-slot--late" : s.entry ? " care-slot--done" : "")}>
                <div className="care-slot__who">
                  <Link to={`${layout}/care/${s.resident._id}`}>{s.resident.name}</Link>
                  {s.resident.allergy && <span className="care-allergy">Allergy: {s.resident.allergy}</span>}
                </div>
                <div className="care-slot__med">
                  <strong>{s.medication.name} {s.medication.dose}</strong>
                  {s.medication.instructions && <small>{s.medication.instructions}</small>}
                  {s.entry && (
                    <small>
                      {s.entry.author?.name} at {timeOf(s.entry.at)}
                      {s.entry.note ? `: ${s.entry.note}` : ""}
                    </small>
                  )}
                </div>
                <div className="care-slot__end">
                  {s.entry ? (
                    <>
                      <Pill tone={tone}>{label}</Pill>
                      <button type="button" className="care-link" onClick={() => setDialog({ ...s, outcome: s.entry.outcome })}>
                        Correct
                      </button>
                    </>
                  ) : canGive(s) ? (
                    <>
                      {s.status === "late" && <Pill tone="bad">Late</Pill>}
                      <button type="button" className="care-btn care-btn--sm care-btn--given" disabled={busy === key} onClick={() => quickGive(s)}>
                        {busy === key ? "Saving…" : "Given"}
                      </button>
                      <button type="button" className="care-btn care-btn--sm care-btn--refused" onClick={() => setDialog({ ...s, outcome: "refused" })}>
                        Refused
                      </button>
                      <button type="button" className="care-btn care-btn--sm care-btn--missed" onClick={() => setDialog({ ...s, outcome: "missed" })}>
                        Missed
                      </button>
                    </>
                  ) : (
                    <Pill tone={tone}>{label}</Pill>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      ))}

      {round.as_needed.length > 0 && (
        <section className="care-slot-group">
          <h4>As needed</h4>
          {round.as_needed.map((a) => (
            <div className="care-slot" key={a.medication._id}>
              <div className="care-slot__who">
                <Link to={`${layout}/care/${a.resident._id}`}>{a.resident.name}</Link>
              </div>
              <div className="care-slot__med">
                <strong>{a.medication.name} {a.medication.dose}</strong>
                <small>{[a.medication.reason, a.medication.instructions].filter(Boolean).join(" · ")}</small>
              </div>
              <div className="care-slot__end">
                <button type="button" className="care-btn care-btn--sm" onClick={() => setDialog({ resident: a.resident, medication: a.medication, time: "", date: round.date })}>
                  Give
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      <DoseDialog
        open={!!dialog}
        slot={dialog}
        onClose={() => setDialog(null)}
        onSaved={() => {
          load();
          onChange && onChange();
        }}
      />
    </>
  );
}

export default MedicineRound;
