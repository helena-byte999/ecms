import React from "react";
import HealthIcon from "components/HealthIcon.js";
import { CHANGE_FIELDS, DOSE, EATEN, INCIDENTS, MEALS, MOODS, SEVERITY, TASKS, dayLabel, timeOf } from "components/care/labels.js";

const ICONS = {
  dose: "medicines", meal: "meal", care: "washHands", wellbeing: "heartbeat",
  activity: "walking", incident: "alert", note: "note", visit: "stethoscope",
};
const ROLE_LABEL = { caregiver: "Caregiver", admin: "Manager" };
export const MOOD_ICONS = { content: "happy", settled: "calm", low: "sad", anxious: "nervous", agitated: "angry", drowsy: "sleepy" };

export const Pill = ({ tone = "muted", children, plain }) => (
  <span className={`care-pill care-pill--${tone}${plain ? " care-pill--plain" : ""}`}>{children}</span>
);

// Title and details for one entry
function describe(e) {
  switch (e.type) {
    case "dose": {
      const [label, tone] = DOSE[e.dose.outcome] || [e.dose.outcome, "muted"];
      return {
        title: <>{e.dose.name} {e.dose.dose}</>,
        badge: <Pill tone={tone}>{label}</Pill>,
        detail: e.dose.time ? `${e.dose.time} dose` : "As needed",
      };
    }
    case "meal": {
      const m = e.meal || {};
      const bits = [m.meal !== "drink" && EATEN[m.eaten], m.drink_ml ? `${m.drink_ml} ml to drink` : null].filter(Boolean);
      return { title: MEALS[m.meal] || "Meal", detail: bits.join(" · ") };
    }
    case "care":
      return { title: "Personal care", detail: (e.care?.tasks || []).map((t) => TASKS[t] || t).join(", ") };
    case "wellbeing": {
      const w = e.wellbeing || {};
      const bits = [w.mood && MOODS[w.mood], typeof w.temperature === "number" && `${w.temperature.toFixed(1)} °C`].filter(Boolean);
      return {
        title: w.mood ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            Wellbeing <HealthIcon name={MOOD_ICONS[w.mood]} size={18} title={MOODS[w.mood]} />
          </span>
        ) : "Wellbeing",
        badge: w.unwell ? <Pill tone="bad">Unwell</Pill> : typeof w.temperature === "number" && w.temperature >= 37.8 ? <Pill tone="warn">High temperature</Pill> : null,
        detail: bits.join(" · "),
      };
    }
    case "activity":
      return { title: e.activity?.name || "Activity" };
    case "incident": {
      const i = e.incident || {};
      return {
        title: `Incident: ${INCIDENTS[i.kind] || i.kind}`,
        badge: <Pill tone={i.severity === "minor" ? "warn" : "bad"}>{SEVERITY[i.severity] || i.severity}</Pill>,
        extra: (
          <>
            {i.action && <p><strong>Action:</strong> {i.action}</p>}
            {i.family_informed && <p className="care-muted">Family informed</p>}
          </>
        ),
      };
    }
    case "visit": {
      const v = e.visit || {};
      return {
        title: <>Doctor's visit: {v.professional}</>,
        badge: <Pill tone="neutral">Records updated</Pill>,
        extra: (
          <>
            <p><strong>Reason:</strong> {v.reason}</p>
            <p><strong>Outcome:</strong> {v.outcome}</p>
            {v.follow_up && <p><strong>Follow-up:</strong> {v.follow_up}</p>}
            {(v.started?.length > 0 || v.stopped?.length > 0 || v.changes?.length > 0) && (
              <ul>
                {(v.started || []).map((m) => <li key={"s" + m.id}>Started {m.name} {m.dose}{m.reason ? ` (${m.reason})` : ""}</li>)}
                {(v.stopped || []).map((m) => <li key={"x" + m.id}>Stopped {m.name} {m.dose}</li>)}
                {(v.changes || []).map((c) => (
                  <li key={c.field}>
                    {CHANGE_FIELDS[c.field] || c.field}: “{c.from || "none"}” → “{c.to || "none"}”
                  </li>
                ))}
              </ul>
            )}
          </>
        ),
      };
    }
    default:
      return { title: "Note" };
  }
}

// A resident's care log grouped by day. `onCorrect(entry)` adds a "Correct" action (staff).
function CareTimeline({ entries, onCorrect }) {
  if (!entries.length) return <p className="care-empty">Nothing recorded in this period.</p>;
  const days = [];
  for (const e of entries) {
    const label = dayLabel(e.at);
    if (!days.length || days[days.length - 1].label !== label) days.push({ label, items: [] });
    days[days.length - 1].items.push(e);
  }
  return days.map((day) => (
    <section className="care-day" key={day.label}>
      <h4>{day.label}</h4>
      {day.items.map((e) => {
        const icon = ICONS[e.type] || "note";
        const d = describe(e);
        return (
          <article className={"care-entry" + (e.corrected_by ? " care-entry--old" : "")} key={e._id}>
            <span className="care-entry__time">{timeOf(e.at)}</span>
            <span className={`care-entry__icon care-entry__icon--${e.type}`} aria-hidden="true"><HealthIcon name={icon} size={20} /></span>
            <div className="care-entry__main">
              <div className="care-entry__title">
                <span>{d.title}</span>
                {d.badge}
                {e.corrected_by && <Pill plain>Corrected</Pill>}
                {e.corrects && <Pill tone="neutral" plain>Correction</Pill>}
              </div>
              {d.detail && <p>{d.detail}</p>}
              {d.extra}
              {e.note && <p>{e.note}</p>}
            </div>
            <div className="care-entry__by">
              {e.author?.name}
              {ROLE_LABEL[e.author?.role] && <small className="care-entry__role">{ROLE_LABEL[e.author?.role]}</small>}
              {onCorrect && !e.corrected_by && e.type !== "visit" && (
                <div>
                  <button type="button" className="care-link" onClick={() => onCorrect(e)}>
                    Correct
                  </button>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </section>
  ));
}

export default CareTimeline;
