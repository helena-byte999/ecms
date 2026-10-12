// Draws an A4 invoice with jsPDF. Pure layout: everything arrives pre-formatted, and
// the jsPDF class is passed in so the (large) library is only loaded on demand.
//
// data: { orgName, orgLine, ref, state: "paid" | "unpaid" | "overdue",
//         billTo: { name, email, address }, issued, due, paidOn,
//         description, type, amount, generated }

const INK = [29, 43, 63];
const MUTED = [102, 117, 138];
const LINE = [225, 231, 236];
const MIST = [244, 247, 249];
const TEAL = [15, 143, 138];
const STATES = {
  paid: { label: "PAID", fg: [23, 121, 79], bg: [228, 244, 235] },
  unpaid: { label: "UNPAID", fg: [147, 89, 10], bg: [255, 242, 219] },
  overdue: { label: "OVERDUE", fg: [173, 48, 54], bg: [252, 235, 235] },
};

// The PDF's built-in fonts only cover Western European characters
const safe = (s) => String(s ?? "").replace(/[–—]/g, "-").replace(/[^\x20-\xFF]/g, "?");

export function buildInvoicePdf(JsPDF, d) {
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const L = 20;
  const R = 190;
  const text = (s, x, y, opts) => doc.text(safe(s), x, y, opts);
  const font = (size, style = "normal", color = INK) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };

  // Brand: teal tile with a house outline
  doc.setFillColor(...TEAL);
  doc.roundedRect(L, 18, 13, 13, 3, 3, "F");
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.7);
  doc.lines([[3.2, -2.6], [3.2, 2.6]], L + 3.3, 24.6);
  doc.rect(L + 4.3, 24.6, 4.4, 3.8);
  font(15, "bold");
  text(d.orgName, L + 17, 24);
  font(9, "normal", MUTED);
  text(d.orgLine, L + 17, 29);

  // Title, reference and status
  font(22, "bold");
  text("INVOICE", R, 25, { align: "right" });
  font(10, "normal", MUTED);
  text(d.ref, R, 31, { align: "right" });
  const st = STATES[d.state] || STATES.unpaid;
  font(8.5, "bold", st.fg);
  const w = doc.getTextWidth(st.label) + 8;
  doc.setFillColor(...st.bg);
  doc.roundedRect(R - w, 34.5, w, 6.5, 3.2, 3.2, "F");
  text(st.label, R - w / 2, 38.9, { align: "center" });

  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.line(L, 48, R, 48);

  // Billed to (left) and dates (right)
  font(8, "bold", MUTED);
  text("BILLED TO", L, 58);
  font(12, "bold");
  text(d.billTo.name || d.billTo.email, L, 65);
  font(10, "normal", INK);
  let y = 71;
  for (const line of doc.splitTextToSize(safe(d.billTo.address || ""), 80)) {
    text(line, L, y);
    y += 5;
  }
  if (d.billTo.name) {
    font(10, "normal", MUTED);
    text(d.billTo.email, L, y);
  }

  const rows = [
    ["Invoice ref", d.ref],
    ["Issued", d.issued],
    ["Due", d.due],
  ];
  if (d.state === "paid") rows.push(["Paid on", d.paidOn]);
  rows.forEach(([k, v], i) => {
    font(9, "normal", MUTED);
    text(k, 125, 58 + i * 7);
    font(10, "bold");
    text(v || "-", R, 58 + i * 7, { align: "right" });
  });

  // Line item
  const top = 98;
  doc.setFillColor(...MIST);
  doc.rect(L, top, R - L, 9, "F");
  font(8, "bold", MUTED);
  text("DESCRIPTION", L + 4, top + 6);
  text("TYPE", 120, top + 6);
  text("AMOUNT", R - 4, top + 6, { align: "right" });
  font(10.5, "normal");
  const descLines = doc.splitTextToSize(safe(d.description || "Care services"), 90);
  descLines.forEach((line, i) => text(line, L + 4, top + 17 + i * 5.5));
  text(d.type || "-", 120, top + 17);
  font(10.5, "bold");
  text(d.amount, R - 4, top + 17, { align: "right" });
  const bottom = top + 17 + (descLines.length - 1) * 5.5 + 7;
  doc.setDrawColor(...LINE);
  doc.line(L, bottom, R, bottom);

  // Total
  font(10, "normal", MUTED);
  text(d.state === "paid" ? "Total paid" : "Total due", 112, bottom + 12);
  font(16, "bold", d.state === "overdue" ? STATES.overdue.fg : INK);
  text(d.amount, R, bottom + 12.5, { align: "right" });
  if (d.state === "overdue") {
    font(9, "normal", STATES.overdue.fg);
    text(`This invoice was due on ${d.due}.`, R, bottom + 19, { align: "right" });
  }

  // Footer
  doc.setDrawColor(...LINE);
  doc.line(L, 272, R, 272);
  font(8.5, "normal", MUTED);
  text("Questions about this invoice? Contact your care administrator.", L, 278);
  text(`Generated ${d.generated} with ECMS`, R, 278, { align: "right" });

  return doc;
}
