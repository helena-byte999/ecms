import React from "react";
import { FiAlertCircle, FiCheck } from "react-icons/fi";

// Dashboard figure: label, value, a status badge that says what needs attention,
// and a short note. Badge tone: "ok" | "warn" | "bad" | "neutral".
function StatCard({ label, value, badge, note }) {
  const icon =
    badge && (badge.tone === "ok" ? <FiCheck aria-hidden="true" /> : badge.tone !== "neutral" ? <FiAlertCircle aria-hidden="true" /> : null);
  return (
    <div className="ecms-stat">
      <div className="ecms-stat__top">
        <span className="ecms-stat__label">{label}</span>
        {badge && (
          <span className={"ecms-badge ecms-badge--" + badge.tone}>
            {icon}
            {badge.text}
          </span>
        )}
      </div>
      <div className="ecms-stat__value">{value ?? "–"}</div>
      {note && <div className="ecms-stat__note">{note}</div>}
    </div>
  );
}

export default StatCard;
