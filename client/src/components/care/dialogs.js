import React, { useEffect, useState } from "react";
import axios from "axios";
import Modal from "react-modal";
import { FiPlus, FiX } from "react-icons/fi";
import { care } from "data/api";
import { MEALS, EATEN, TASKS, MOODS, INCIDENTS, SEVERITY, ymd } from "components/care/labels.js";

const modalStyle = {
  overlay: { zIndex: 1100, background: "rgba(15, 23, 42, 0.45)" },
  content: {
    top: "50%",
    left: "50%",
    right: "auto",
    bottom: "auto",
    transform: "translate(-50%, -50%)",
    maxHeight: "92vh",
    maxWidth: "calc(100vw - 24px)",
    overflowY: "auto",
    borderRadius: 16,
    padding: 24,
  },
};

const errorOf = (err) => err.response?.data?.msg || "Couldn't reach the server. Please try again.";
const localNow = () => {
  const d = new Date();
  return `${ymd(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

// Shared shell: title, intro, error, and Cancel / Save buttons
function CareDialog({ open, onClose, title, intro, error, busy, onSubmit, submitLabel = "Save", children }) {
  return (
    <Modal isOpen={open} onRequestClose={() => !busy && onClose()} contentLabel={title} style={modalStyle}>
      <form
        className="care-dialog"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <h4>{title}</h4>
        {intro && <p>{intro}</p>}
        <div className="care-form">
          {children}
          {error && (
            <div className="care-error" role="alert">
              {error}
            </div>
          )}
          <div className="care-dialog__foot">
            <button type="button" className="care-btn" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="care-btn care-btn--primary" disabled={busy}>
              {busy ? "Saving…" : submitLabel}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// Pill-style radio buttons
function Choices({ name, options, value, onChange, multiple = false }) {
  return (
    <div className="care-choices" role={multiple ? "group" : "radiogroup"}>
      {Object.entries(options).map(([key, label]) => (
        <label className="care-choice" key={key}>
          <input
            type={multiple ? "checkbox" : "radio"}
            name={name}
            value={key}
            checked={multiple ? (value || []).includes(key) : value === key}
            onChange={() => {
              if (!multiple) return onChange(key);
              const list = value || [];
              onChange(list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);
            }}
          />
          <span>{label}</span>
        </label>
      ))}
    </div>
  );
}

function useSave(onSaved, onClose) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(request) {
    setBusy(true);
    setError("");
    try {
      const res = await request();
      onSaved(res.data.data);
      onClose();
    } catch (err) {
      setError(errorOf(err));
    }
    setBusy(false);
  }
  return { busy, error, setError, save };
}

const ENTRY_KINDS = {
  meal: "Meal or drink",
  care: "Personal care",
  wellbeing: "Wellbeing",
  activity: "Activity",
  incident: "Incident",
  note: "Note",
};

// Add a care entry, or correct one (`correcting` is the entry being replaced)
export function EntryDialog({ open, onClose, resident, correcting, onSaved }) {
  const [form, setForm] = useState({});
  const { busy, error, setError, save } = useSave(onSaved, onClose);
  useEffect(() => {
    if (!open) return;
    setError("");
    setForm(
      correcting
        ? { type: correcting.type, note: correcting.note || "", ...JSON.parse(JSON.stringify(correcting)) }
        : { type: "meal", at: localNow(), meal: { meal: "lunch" }, care: { tasks: [] }, wellbeing: {}, incident: {}, activity: {} },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const set = (path, value) =>
    setForm((f) => {
      const [a, b] = path.split(".");
      return b ? { ...f, [a]: { ...(f[a] || {}), [b]: value } } : { ...f, [a]: value };
    });
  const type = form.type;

  function submit() {
    const body = { type, note: form.note, corrects: correcting?._id };
    if (!correcting && form.at) body.at = new Date(form.at).toISOString();
    if (type === "meal") body.meal = form.meal;
    if (type === "care") body.care = form.care;
    if (type === "wellbeing") body.wellbeing = form.wellbeing;
    if (type === "activity") body.activity = form.activity;
    if (type === "incident") body.incident = form.incident;
    save(() => axios.post(`${care.resident}/${resident._id}/entries`, body));
  }

  return (
    <CareDialog
      open={open}
      onClose={onClose}
      busy={busy}
      error={error}
      onSubmit={submit}
      title={correcting ? "Correct this entry" : `Add to ${resident?.first_name || "the"} care log`}
      intro={
        correcting
          ? "The original stays in the log, marked as corrected. Your correction replaces it in reports."
          : "Entries can't be edited or deleted later. If you make a mistake, add a correction."
      }
      submitLabel={correcting ? "Save correction" : "Add entry"}
    >
      {!correcting && (
        <fieldset>
          <legend>What are you recording?</legend>
          <Choices name="type" options={ENTRY_KINDS} value={type} onChange={(v) => set("type", v)} />
        </fieldset>
      )}

      {type === "meal" && (
        <>
          <fieldset>
            <legend>Meal</legend>
            <Choices name="meal" options={MEALS} value={form.meal?.meal} onChange={(v) => set("meal.meal", v)} />
          </fieldset>
          {form.meal?.meal !== "drink" && (
            <fieldset>
              <legend>How much was eaten?</legend>
              <Choices name="eaten" options={EATEN} value={form.meal?.eaten} onChange={(v) => set("meal.eaten", v)} />
            </fieldset>
          )}
          <div>
            <label htmlFor="care-ml">Drink (ml)</label>
            <input id="care-ml" type="number" min="0" max="3000" step="10" value={form.meal?.drink_ml ?? ""} onChange={(e) => set("meal.drink_ml", e.target.value)} />
          </div>
        </>
      )}

      {type === "care" && (
        <fieldset>
          <legend>What was done?</legend>
          <Choices name="tasks" multiple options={TASKS} value={form.care?.tasks} onChange={(v) => set("care.tasks", v)} />
        </fieldset>
      )}

      {type === "wellbeing" && (
        <>
          <fieldset>
            <legend>Mood</legend>
            <Choices name="mood" options={MOODS} value={form.wellbeing?.mood} onChange={(v) => set("wellbeing.mood", v)} />
          </fieldset>
          <div className="care-form__row">
            <div>
              <label htmlFor="care-temp">Temperature (°C)</label>
              <input id="care-temp" type="number" step="0.1" min="34" max="43" value={form.wellbeing?.temperature ?? ""} onChange={(e) => set("wellbeing.temperature", e.target.value)} />
            </div>
            <label className="care-check" style={{ alignSelf: "end", marginBottom: 10 }}>
              <input type="checkbox" checked={!!form.wellbeing?.unwell} onChange={(e) => set("wellbeing.unwell", e.target.checked)} />
              Unwell today
            </label>
          </div>
        </>
      )}

      {type === "activity" && (
        <div>
          <label htmlFor="care-activity">Activity</label>
          <input id="care-activity" type="text" maxLength={80} placeholder="e.g. Garden walk" value={form.activity?.name || ""} onChange={(e) => set("activity.name", e.target.value)} />
        </div>
      )}

      {type === "incident" && (
        <>
          <fieldset>
            <legend>What kind of incident?</legend>
            <Choices name="kind" options={INCIDENTS} value={form.incident?.kind} onChange={(v) => set("incident.kind", v)} />
          </fieldset>
          <fieldset>
            <legend>How serious?</legend>
            <Choices name="severity" options={SEVERITY} value={form.incident?.severity} onChange={(v) => set("incident.severity", v)} />
          </fieldset>
          <div>
            <label htmlFor="care-action">Action taken</label>
            <textarea id="care-action" maxLength={500} value={form.incident?.action || ""} onChange={(e) => set("incident.action", e.target.value)} />
          </div>
          <label className="care-check">
            <input type="checkbox" checked={!!form.incident?.family_informed} onChange={(e) => set("incident.family_informed", e.target.checked)} />
            Family informed
          </label>
        </>
      )}

      <div>
        <label htmlFor="care-note">{type === "incident" ? "What happened" : type === "note" ? "Note" : "Note (optional)"}</label>
        <textarea id="care-note" maxLength={1000} value={form.note || ""} onChange={(e) => set("note", e.target.value)} />
      </div>

      {!correcting && (
        <div>
          <label htmlFor="care-at">When</label>
          <input id="care-at" type="datetime-local" max={localNow()} value={form.at || ""} onChange={(e) => set("at", e.target.value)} />
        </div>
      )}
    </CareDialog>
  );
}

const OUTCOME_LABELS = { given: "Given", refused: "Refused", missed: "Missed" };

// Record a dose (or correct one). `slot`: { medication, time, date, outcome, entry, resident }
export function DoseDialog({ open, onClose, slot, onSaved }) {
  const [outcome, setOutcome] = useState("given");
  const [note, setNote] = useState("");
  const { busy, error, setError, save } = useSave(onSaved, onClose);
  useEffect(() => {
    if (!open || !slot) return;
    setError("");
    setOutcome(slot.outcome || "given");
    setNote("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  if (!slot) return null;
  const med = slot.medication;
  const asNeeded = !slot.time;
  const correcting = slot.entry;

  return (
    <CareDialog
      open={open}
      onClose={onClose}
      busy={busy}
      error={error}
      title={correcting ? `Correct the ${slot.time} dose` : asNeeded ? `Give ${med.name}` : `${med.name} at ${slot.time}`}
      intro={`${slot.resident?.name || ""}: ${med.name} ${med.dose}${med.instructions ? ` (${med.instructions})` : ""}`}
      submitLabel={correcting ? "Save correction" : "Record dose"}
      onSubmit={() =>
        save(() =>
          axios.post(`${care.resident}/${slot.resident._id}/entries`, {
            type: "dose",
            note,
            corrects: correcting?._id,
            dose: { medication: med._id, time: slot.time || "", date: slot.date, outcome },
          }),
        )
      }
    >
      {!asNeeded && (
        <fieldset>
          <legend>Outcome</legend>
          <Choices name="outcome" options={OUTCOME_LABELS} value={outcome} onChange={setOutcome} />
        </fieldset>
      )}
      <div>
        <label htmlFor="dose-note">{asNeeded ? "Why was it given?" : outcome === "given" ? "Note (optional)" : "What happened?"}</label>
        <textarea id="dose-note" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </CareDialog>
  );
}

const blankMedicine = () => ({ name: "", dose: "", times: ["08:00"], as_needed: false, instructions: "", reason: "", end_date: "" });

// The fields for one medicine (used when adding one and in the doctor's visit form)
export function MedicineFields({ value, onChange, idPrefix = "med" }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  return (
    <>
      <div className="care-form__row">
        <div>
          <label htmlFor={`${idPrefix}-name`}>Medicine</label>
          <input id={`${idPrefix}-name`} type="text" maxLength={80} placeholder="e.g. Amoxicillin" value={value.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-dose`}>Dose</label>
          <input id={`${idPrefix}-dose`} type="text" maxLength={60} placeholder="e.g. 500 mg" value={value.dose} onChange={(e) => set("dose", e.target.value)} />
        </div>
      </div>
      <fieldset>
        <legend>When</legend>
        <label className="care-check" style={{ marginBottom: 8 }}>
          <input type="checkbox" checked={value.as_needed} onChange={(e) => set("as_needed", e.target.checked)} />
          As needed (not at set times)
        </label>
        {!value.as_needed && (
          <div className="care-times">
            {value.times.map((t, i) => (
              <span key={i} className="care-times">
                <input
                  type="time"
                  aria-label={`Time ${i + 1}`}
                  value={t}
                  onChange={(e) => set("times", value.times.map((x, j) => (j === i ? e.target.value : x)))}
                />
                {value.times.length > 1 && (
                  <button type="button" className="care-link" aria-label={`Remove time ${i + 1}`} onClick={() => set("times", value.times.filter((_, j) => j !== i))}>
                    <FiX />
                  </button>
                )}
              </span>
            ))}
            {value.times.length < 6 && (
              <button type="button" className="care-btn care-btn--sm" onClick={() => set("times", [...value.times, "12:00"])}>
                <FiPlus aria-hidden="true" /> Add a time
              </button>
            )}
          </div>
        )}
      </fieldset>
      <div className="care-form__row">
        <div>
          <label htmlFor={`${idPrefix}-reason`}>Reason</label>
          <input id={`${idPrefix}-reason`} type="text" maxLength={120} placeholder="e.g. Chest infection" value={value.reason} onChange={(e) => set("reason", e.target.value)} />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-end`}>Last day (for a course)</label>
          <input id={`${idPrefix}-end`} type="date" min={ymd()} value={value.end_date} onChange={(e) => set("end_date", e.target.value)} />
        </div>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-instructions`}>Instructions</label>
        <input id={`${idPrefix}-instructions`} type="text" maxLength={200} placeholder="e.g. With food" value={value.instructions} onChange={(e) => set("instructions", e.target.value)} />
      </div>
    </>
  );
}

const cleanMedicine = (m) => ({ ...m, times: m.as_needed ? [] : m.times.filter(Boolean), end_date: m.end_date || undefined });

export function MedicineDialog({ open, onClose, resident, onSaved }) {
  const [med, setMed] = useState(blankMedicine());
  const { busy, error, setError, save } = useSave(onSaved, onClose);
  useEffect(() => {
    if (open) {
      setMed(blankMedicine());
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  return (
    <CareDialog
      open={open}
      onClose={onClose}
      busy={busy}
      error={error}
      title={`Add a medicine for ${resident?.first_name || "this resident"}`}
      intro="Doses at set times appear on the medicine round from now on."
      submitLabel="Add medicine"
      onSubmit={() => save(() => axios.post(`${care.resident}/${resident._id}/medications`, cleanMedicine(med)))}
    >
      <MedicineFields value={med} onChange={setMed} />
    </CareDialog>
  );
}

export function StopMedicineDialog({ open, onClose, resident, medication, onSaved }) {
  const [reason, setReason] = useState("");
  const { busy, error, setError, save } = useSave(onSaved, onClose);
  useEffect(() => {
    if (open) {
      setReason("");
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  if (!medication) return null;
  return (
    <CareDialog
      open={open}
      onClose={onClose}
      busy={busy}
      error={error}
      title={`Stop ${medication.name}?`}
      intro="It comes off the medicine round now and stays in the history."
      submitLabel="Stop medicine"
      onSubmit={() => save(() => axios.post(`${care.resident}/${resident._id}/medications/${medication._id}/stop`, { reason }))}
    >
      <div>
        <label htmlFor="stop-reason">Why is it being stopped?</label>
        <input id="stop-reason" type="text" maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
    </CareDialog>
  );
}

// Record a doctor's visit. Medicines to start or stop and changes to allergies and
// conditions are applied to the resident's records when it's saved.
export function VisitDialog({ open, onClose, resident, medicines = [], onSaved }) {
  const [form, setForm] = useState({});
  const [starts, setStarts] = useState([]);
  const [stops, setStops] = useState({});
  const { busy, error, setError, save } = useSave(onSaved, onClose);
  useEffect(() => {
    if (!open) return;
    // usually the resident's own GP
    setForm({ at: localNow(), professional: resident?.gp || "", allergy: resident?.allergy || "", conditions: resident?.conditions || "" });
    setStarts([]);
    setStops({});
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function submit() {
    const profile = {};
    if (form.allergy !== (resident.allergy || "")) profile.allergy = form.allergy;
    if (form.conditions !== (resident.conditions || "")) profile.conditions = form.conditions;
    save(() =>
      axios.post(`${care.resident}/${resident._id}/visits`, {
        at: new Date(form.at).toISOString(),
        professional: form.professional,
        reason: form.reason,
        outcome: form.outcome,
        follow_up: form.follow_up,
        note: form.note,
        start: starts.map(cleanMedicine),
        stop: Object.entries(stops).filter(([, s]) => s.on).map(([id, s]) => ({ id, reason: s.reason })),
        profile,
      }),
    );
  }

  return (
    <CareDialog
      open={open}
      onClose={onClose}
      busy={busy}
      error={error}
      title="Record a doctor's visit"
      intro={`Changes to ${resident?.first_name || "the resident"}'s medicines, allergies and conditions are applied when you save, and kept in the care log.`}
      submitLabel="Save visit"
      onSubmit={submit}
    >
      <div className="care-form__row">
        <div>
          <label htmlFor="visit-who">Who visited</label>
          <input id="visit-who" type="text" maxLength={120} placeholder="e.g. Dr Patel, GP" value={form.professional || ""} onChange={(e) => set("professional", e.target.value)} />
        </div>
        <div>
          <label htmlFor="visit-at">When</label>
          <input id="visit-at" type="datetime-local" max={localNow()} value={form.at || ""} onChange={(e) => set("at", e.target.value)} />
        </div>
      </div>
      <div>
        <label htmlFor="visit-reason">Reason for the visit</label>
        <input id="visit-reason" type="text" maxLength={300} value={form.reason || ""} onChange={(e) => set("reason", e.target.value)} />
      </div>
      <div>
        <label htmlFor="visit-outcome">Outcome</label>
        <textarea id="visit-outcome" maxLength={1000} value={form.outcome || ""} onChange={(e) => set("outcome", e.target.value)} />
      </div>
      <div>
        <label htmlFor="visit-follow">Follow-up</label>
        <input id="visit-follow" type="text" maxLength={300} placeholder="e.g. Review in 7 days" value={form.follow_up || ""} onChange={(e) => set("follow_up", e.target.value)} />
      </div>

      <fieldset>
        <legend>Medicines to start</legend>
        {starts.map((m, i) => (
          <div className="care-subform" key={i}>
            <MedicineFields idPrefix={`start-${i}`} value={m} onChange={(v) => setStarts(starts.map((x, j) => (j === i ? v : x)))} />
            <button type="button" className="care-link" style={{ marginTop: 8 }} onClick={() => setStarts(starts.filter((_, j) => j !== i))}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="care-btn care-btn--sm" style={{ marginTop: starts.length ? 8 : 0 }} onClick={() => setStarts([...starts, blankMedicine()])}>
          <FiPlus aria-hidden="true" /> Add a medicine
        </button>
      </fieldset>

      {medicines.length > 0 && (
        <fieldset>
          <legend>Medicines to stop</legend>
          {medicines.map((m) => (
            <div key={m._id} style={{ marginBottom: 6 }}>
              <label className="care-check">
                <input type="checkbox" checked={!!stops[m._id]?.on} onChange={(e) => setStops({ ...stops, [m._id]: { ...stops[m._id], on: e.target.checked } })} />
                {m.name} {m.dose}
              </label>
              {stops[m._id]?.on && (
                <input
                  type="text"
                  aria-label={`Why ${m.name} is stopped`}
                  placeholder="Reason (optional)"
                  maxLength={200}
                  value={stops[m._id]?.reason || ""}
                  onChange={(e) => setStops({ ...stops, [m._id]: { ...stops[m._id], reason: e.target.value } })}
                  style={{ marginTop: 6 }}
                />
              )}
            </div>
          ))}
        </fieldset>
      )}

      <div className="care-form__row">
        <div>
          <label htmlFor="visit-allergy">Allergies</label>
          <input id="visit-allergy" type="text" maxLength={300} value={form.allergy || ""} onChange={(e) => set("allergy", e.target.value)} />
        </div>
        <div>
          <label htmlFor="visit-conditions">Conditions</label>
          <input id="visit-conditions" type="text" maxLength={300} value={form.conditions || ""} onChange={(e) => set("conditions", e.target.value)} />
        </div>
      </div>
      <div>
        <label htmlFor="visit-note">Note (optional)</label>
        <textarea id="visit-note" maxLength={1000} placeholder="e.g. Daughter informed by phone" value={form.note || ""} onChange={(e) => set("note", e.target.value)} />
      </div>
    </CareDialog>
  );
}
