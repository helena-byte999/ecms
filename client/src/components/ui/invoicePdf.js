import { formatDate, formatMoney, invoiceState } from "components/ui/ListUI.js";
import { buildInvoicePdf } from "components/ui/invoicePdfLayout.js";

// Shown at the top of every invoice; set per care home
const ORG_NAME = process.env.REACT_APP_ORG_NAME || "ECMS";
const ORG_LINE = process.env.REACT_APP_ORG_LINE || "Elderly Care Management";

export const invoiceRef = (inv) =>
  "INV-" + String(inv._id || "").slice(-6).toUpperCase();

// The PDF's built-in fonts can't draw every currency symbol (e.g. ₦),
// so fall back to the code ("NGN 1,200.00") when needed
function pdfMoney(value) {
  const tidy = (s) => s.replace(/[  ]/g, " ");
  const symbol = tidy(formatMoney(value));
  return /[^\x20-\xFF]/.test(symbol) ? tidy(formatMoney(value, "code")) : symbol;
}

// Builds and downloads the invoice as a PDF. `person` (name, address) is optional.
export async function downloadInvoicePdf(invoice, person = {}) {
  const { jsPDF } = await import("jspdf");
  const doc = buildInvoicePdf(jsPDF, {
    orgName: ORG_NAME,
    orgLine: ORG_LINE,
    ref: invoiceRef(invoice),
    state: invoiceState(invoice),
    billTo: {
      name: [person.first_name, person.last_name].filter(Boolean).join(" "),
      email: invoice.email,
      address: person.address,
    },
    issued: formatDate(invoice.date_created),
    due: formatDate(invoice.due_date),
    paidOn: formatDate(invoice.paid_at),
    description: invoice.description,
    type: invoice.type,
    amount: pdfMoney(invoice.amount),
    generated: formatDate(new Date()),
  });
  const month = String(invoice.date_created || "").slice(0, 7);
  doc.save(`ECMS-invoice-${invoiceRef(invoice).slice(4)}${month ? "-" + month : ""}.pdf`);
}
