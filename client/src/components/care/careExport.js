// Care reports as PDF (jsPDF, loaded on demand) and CSV.
import { formatDate } from "components/ui/ListUI.js";
import { CHANGE_FIELDS, EATEN, INCIDENTS, MOODS, SEVERITY } from "components/care/labels.js";

const ORG_NAME = process.env.REACT_APP_ORG_NAME || "ECMS";
const ORG_LINE = process.env.REACT_APP_ORG_LINE || "Elderly Care Management";
const INK = [29, 43, 63];
const MUTED = [102, 117, 138];
const LINE = [225, 231, 236];
const MIST = [244, 247, 249];
const TEAL = [15, 143, 138];

// The PDF's built-in fonts only cover Western European characters
const safe = (s) => String(s ?? "").replace(/[–—]/g, "-").replace(/[“”]/g, '"').replace(/→/g, "->").replace(/[^\x20-\xFF]/g, "?");
const pct = (n) => (n === null || n === undefined ? "-" : `${n}%`);
const when = (at) => `${formatDate(at)} ${new Date(at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// A small page-flowing writer on top of jsPDF
function writer(JsPDF, title, subtitle) {
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const L = 18;
  const R = 192;
  let y = 0;
  const font = (size, style = "normal", color = INK) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };
  const header = () => {
    doc.setFillColor(...TEAL);
    doc.roundedRect(L, 14, 11, 11, 2.5, 2.5, "F");
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.6);
    doc.lines([[2.7, -2.2], [2.7, 2.2]], L + 2.8, 19.4);
    doc.rect(L + 3.6, 19.4, 3.8, 3.2);
    font(13, "bold");
    doc.text(safe(ORG_NAME), L + 14, 19.5);
    font(8.5, "normal", MUTED);
    doc.text(safe(ORG_LINE), L + 14, 24);
    font(8.5, "normal", MUTED);
    doc.text(safe(`Generated ${formatDate(new Date())}`), R, 19.5, { align: "right" });
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(L, 30, R, 30);
    y = 40;
  };
  const room = (h) => {
    if (y + h > 280) {
      doc.addPage();
      header();
    }
  };
  header();
  font(18, "bold");
  doc.text(safe(title), L, y);
  y += 7;
  font(10, "normal", MUTED);
  doc.text(safe(subtitle), L, y);
  y += 10;

  return {
    doc,
    heading(s) {
      room(16);
      y += 3;
      font(11.5, "bold");
      doc.text(safe(s), L, y);
      y += 6;
    },
    para(s, color = INK) {
      font(9.5, "normal", color);
      for (const line of doc.splitTextToSize(safe(s), R - L)) {
        room(6);
        doc.text(line, L, y);
        y += 4.8;
      }
      y += 1.5;
    },
    // Key figures as boxes, four to a row
    figures(items) {
      const w = (R - L - 9) / 4;
      items.forEach(([label, value], i) => {
        if (i % 4 === 0) room(18);
        const x = L + (i % 4) * (w + 3);
        doc.setFillColor(...MIST);
        doc.roundedRect(x, y, w, 15, 2, 2, "F");
        font(7.5, "normal", MUTED);
        doc.text(safe(label), x + 3, y + 5);
        font(12, "bold");
        doc.text(safe(value), x + 3, y + 11.5);
        if (i % 4 === 3 || i === items.length - 1) y += 18;
      });
      y += 1;
    },
    // cols: [{ label, width (mm), align }]
    table(cols, rows) {
      const head = () => {
        room(10);
        doc.setFillColor(...MIST);
        doc.rect(L, y - 4.2, R - L, 6.5, "F");
        font(7.5, "bold", MUTED);
        let x = L + 2;
        for (const c of cols) {
          doc.text(safe(c.label.toUpperCase()), c.align === "right" ? x + c.width - 3 : x, y, { align: c.align === "right" ? "right" : "left" });
          x += c.width;
        }
        y += 6;
      };
      head();
      if (!rows.length) {
        font(9, "normal", MUTED);
        doc.text("None in this period.", L + 2, y);
        y += 7;
        return;
      }
      for (const row of rows) {
        font(9, "normal");
        const cells = row.map((v, i) => doc.splitTextToSize(safe(v), cols[i].width - 4));
        const h = Math.max(...cells.map((c) => c.length)) * 4.3 + 2;
        if (y + h > 280) {
          doc.addPage();
          header();
          head();
          font(9, "normal");
        }
        const top = y;
        let x = L + 2;
        for (let i = 0; i < cells.length; i++) {
          const right = cols[i].align === "right";
          for (let k = 0; k < cells[i].length; k++) {
            doc.text(cells[i][k], right ? x + cols[i].width - 3 : x, top + k * 4.3, { align: right ? "right" : "left" });
          }
          x += cols[i].width;
        }
        y += h;
        doc.setDrawColor(...LINE);
        doc.line(L, y - 3, R, y - 3);
        y += 1.5;
      }
      y += 2;
    },
  };
}

function download(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const csvCell = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (rows) => "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");

const residentName = (s) => `${s.resident.first_name} ${s.resident.last_name}`;
const period = (s) => `${formatDate(s.from)} to ${formatDate(s.to)}`;

// ---- One resident's care summary
export async function summaryPdf(s) {
  const { jsPDF } = await import("jspdf");
  const w = writer(jsPDF, `Care summary: ${residentName(s)}`, `${period(s)}${s.resident.allergy ? ` · Allergies: ${s.resident.allergy}` : ""}`);
  if (s.resident.conditions) w.para(`Conditions: ${s.resident.conditions}`, MUTED);
  w.heading("Medicines");
  w.figures([
    ["Doses given", `${s.doses.given} of ${s.doses.scheduled - s.doses.due}`],
    ["Completion", pct(s.doses.completion)],
    ["Refused", String(s.doses.refused)],
    ["Missed / not recorded", `${s.doses.missed} / ${s.doses.not_recorded}`],
  ]);
  w.table(
    [{ label: "Medicine", width: 62 }, { label: "Times", width: 34 }, { label: "Given", width: 18, align: "right" }, { label: "Refused", width: 20, align: "right" }, { label: "Missed", width: 18, align: "right" }, { label: "Not rec.", width: 22, align: "right" }],
    s.medicines.map((m) => [`${m.name} ${m.dose}${m.status === "stopped" ? " (stopped)" : ""}`, m.as_needed ? `As needed (${m.as_needed_given} given)` : m.times.join(", "), m.given, m.refused, m.missed, m.not_recorded]),
  );
  if (s.changes.length) {
    w.heading("Medicine changes");
    w.table([{ label: "When", width: 36 }, { label: "Change", width: 70 }, { label: "Reason", width: 68 }], s.changes.map((c) => [formatDate(c.at), `${c.kind === "started" ? "Started" : "Stopped"} ${c.name} ${c.dose}`, c.reason || ""]));
  }
  w.heading("Doctor's visits");
  w.table(
    [{ label: "When", width: 30 }, { label: "Who", width: 40 }, { label: "Reason and outcome", width: 104 }],
    s.visits.map((v) => [when(v.at), v.professional, `${v.reason}. ${v.outcome}${v.follow_up ? ` Follow-up: ${v.follow_up}` : ""}${(v.changes || []).map((c) => ` ${CHANGE_FIELDS[c.field] || c.field} changed to "${c.to}".`).join("")}`]),
  );
  w.heading("Incidents");
  w.table(
    [{ label: "When", width: 30 }, { label: "What", width: 34 }, { label: "Details and action", width: 110 }],
    s.incidents.map((i) => [when(i.at), `${INCIDENTS[i.kind] || i.kind} (${SEVERITY[i.severity] || i.severity})`, `${i.note || ""} ${i.action ? `Action: ${i.action}` : ""}${i.family_informed ? " Family informed." : ""}`]),
  );
  w.heading("Wellbeing and meals");
  w.figures([
    ["Days unwell", String(s.wellbeing.days_unwell)],
    ["Highest temperature", s.wellbeing.max_temperature ? `${s.wellbeing.max_temperature} C` : "-"],
    ["Meals recorded", String(s.meals.recorded)],
    ["Drinks per day", s.meals.drink_ml_per_day ? `${s.meals.drink_ml_per_day} ml` : "-"],
  ]);
  const moods = Object.entries(s.wellbeing.moods).map(([m, n]) => `${MOODS[m] || m} ${n}`).join(", ");
  const eaten = Object.entries(s.meals.eaten).map(([k, n]) => `${EATEN[k] || k} ${n}`).join(", ");
  if (moods) w.para(`Moods recorded: ${moods}.`);
  if (eaten) w.para(`Meals: ${eaten}.`);
  w.heading("Recorded by");
  w.para(`${s.entries.total} entries: ${s.entries.by_author.map((a) => `${a.name} (${a.count})`).join(", ") || "none"}.`);
  w.doc.save(`ECMS-care-summary-${slug(residentName(s))}-${s.from}-to-${s.to}.pdf`);
}

export function summaryCsv(s) {
  const rows = [
    ["Care summary", residentName(s)],
    ["Period", s.from, s.to],
    [],
    ["Medicine", "Dose", "Times", "Status", "Scheduled", "Given", "Refused", "Missed", "Not recorded", "As needed given"],
    ...s.medicines.map((m) => [m.name, m.dose, m.as_needed ? "As needed" : m.times.join(" "), m.status, m.scheduled, m.given, m.refused, m.missed, m.not_recorded, m.as_needed_given]),
    [],
    ["Visit date", "Professional", "Reason", "Outcome", "Follow-up"],
    ...s.visits.map((v) => [new Date(v.at).toISOString(), v.professional, v.reason, v.outcome, v.follow_up || ""]),
    [],
    ["Incident date", "Kind", "Severity", "Details", "Action", "Family informed"],
    ...s.incidents.map((i) => [new Date(i.at).toISOString(), i.kind, i.severity, i.note || "", i.action || "", i.family_informed ? "yes" : "no"]),
  ];
  download(toCsv(rows), `ECMS-care-summary-${slug(residentName(s))}-${s.from}-to-${s.to}.csv`, "text/csv;charset=utf-8");
}

// ---- Home overview (admin)
export async function reportPdf(r) {
  const { jsPDF } = await import("jspdf");
  const w = writer(jsPDF, "Care overview", `${formatDate(r.from)} to ${formatDate(r.to)} · ${r.residents.length} residents`);
  w.figures([
    ["Doses given", `${r.totals.given} of ${r.totals.scheduled - r.totals.due}`],
    ["Completion", pct(r.totals.completion)],
    ["Refused / missed", `${r.totals.refused} / ${r.totals.missed}`],
    ["Not recorded", String(r.totals.not_recorded)],
    ["Incidents", String(r.totals.incidents)],
    ["Doctor's visits", String(r.totals.visits)],
    ["Care entries", String(r.totals.entries)],
  ]);
  w.heading("By resident");
  w.table(
    [{ label: "Resident", width: 46 }, { label: "Given", width: 22, align: "right" }, { label: "Done", width: 16, align: "right" }, { label: "Refused", width: 18, align: "right" }, { label: "Missed", width: 17, align: "right" }, { label: "Not rec.", width: 18, align: "right" }, { label: "Incid.", width: 16, align: "right" }, { label: "Visits", width: 21, align: "right" }],
    r.residents.map((x) => [x.name, `${x.given}/${x.scheduled - x.due}`, pct(x.completion), x.refused, x.missed, x.not_recorded, x.incidents, x.visits]),
  );
  w.heading("Incidents");
  w.table(
    [{ label: "When", width: 30 }, { label: "Resident", width: 36 }, { label: "What", width: 30 }, { label: "Details", width: 78 }],
    r.incidents.map((i) => [when(i.at), i.resident, `${INCIDENTS[i.kind] || i.kind} (${SEVERITY[i.severity] || i.severity})`, `${i.note || ""}${i.action ? ` Action: ${i.action}` : ""}`]),
  );
  w.heading("Entries by staff");
  w.table([{ label: "Name", width: 90 }, { label: "Entries", width: 42, align: "right" }, { label: "Doses", width: 42, align: "right" }], r.caregivers.map((c) => [c.name, c.entries, c.doses]));
  w.doc.save(`ECMS-care-overview-${r.from}-to-${r.to}.pdf`);
}

export function reportCsv(r) {
  const rows = [
    ["Resident", "Scheduled", "Given", "Refused", "Missed", "Not recorded", "Due now", "Completion %", "Incidents", "Doctor's visits", "Entries"],
    ...r.residents.map((x) => [x.name, x.scheduled, x.given, x.refused, x.missed, x.not_recorded, x.due, x.completion ?? "", x.incidents, x.visits, x.entries]),
    ["Total", r.totals.scheduled, r.totals.given, r.totals.refused, r.totals.missed, r.totals.not_recorded, r.totals.due, r.totals.completion ?? "", r.totals.incidents, r.totals.visits, r.totals.entries],
  ];
  download(toCsv(rows), `ECMS-care-overview-${r.from}-to-${r.to}.csv`, "text/csv;charset=utf-8");
}
