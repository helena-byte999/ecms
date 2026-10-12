import React from "react";
import { FiCalendar, FiPlus, FiSearch } from "react-icons/fi";
import { HiChevronDown, HiChevronUp, HiSelector } from "react-icons/hi";

// Shared pieces for list pages: avatars, person/date cells, icon actions and the list title bar.

const avatarTones = ["teal", "coral", "navy", "amber", "plum"];

function initialsOf(name = "") {
  // for an email, only the part before @ is the person
  const parts = name.trim().split("@")[0].split(/[\s._-]+/).filter(Boolean);
  return ((parts[0] || "")[0] || "?") + ((parts[1] || "")[0] || "");
}

// Same name always gets the same colour
function toneOf(name = "") {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return avatarTones[hash % avatarTones.length];
}

export function Avatar({ name, size = "md" }) {
  return (
    <span
      className={`ecms-av ecms-av--${toneOf(name)} ecms-av--${size}`}
      aria-hidden="true"
    >
      {initialsOf(name).toUpperCase()}
    </span>
  );
}

export function AvatarStack({ names = [], max = 4 }) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <span className="ecms-avstack" title={names.join(", ")}>
      {shown.map((n) => (
        <Avatar key={n} name={n} size="sm" />
      ))}
      {extra > 0 && <span className="ecms-avstack__more">+{extra}</span>}
      <span className="sr-only">{names.join(", ")}</span>
    </span>
  );
}

export function PersonCell({ name, email }) {
  return (
    <span className="ecms-person">
      <Avatar name={name || email} />
      <span className="ecms-person__text">
        <strong>{name || email}</strong>
        {name && email && <small>{email}</small>}
      </span>
    </span>
  );
}

export function formatDate(value) {
  if (!value) return "–";
  const d = new Date(value);
  if (isNaN(d)) return String(value);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Each deployment serves one care home, so its currency is a deployment setting
// (REACT_APP_CURRENCY, e.g. GBP, NGN, USD), not the viewer's locale.
const CURRENCY = process.env.REACT_APP_CURRENCY || "GBP";
const LOCALE = process.env.REACT_APP_LOCALE || "en-GB";

export function formatMoney(value) {
  const amount = Number(value);
  if (value === "" || value == null || isNaN(amount)) return "–";
  try {
    return new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency: CURRENCY,
    }).format(amount);
  } catch (e) {
    // unknown currency code: fall back to a plain number
    return amount.toLocaleString(LOCALE);
  }
}

// "paid", "unpaid", or "overdue" (unpaid and past its due date)
export function invoiceState(inv) {
  if (inv.status === "paid") return "paid";
  const today = new Date().toISOString().slice(0, 10);
  return inv.due_date && inv.due_date < today ? "overdue" : "unpaid";
}

export function InvoiceStatus({ invoice }) {
  const state = invoiceState(invoice);
  const kind = { paid: "ok", unpaid: "warn", overdue: "bad" }[state];
  return (
    <span className={"ecms-status ecms-status--" + kind}>
      {state[0].toUpperCase() + state.slice(1)}
    </span>
  );
}

export function DateCell({ value, to }) {
  return (
    <span className="ecms-date">
      <FiCalendar aria-hidden="true" />
      {formatDate(value)}
      {to !== undefined && <> – {formatDate(to)}</>}
    </span>
  );
}

export function IconButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      className="ecms-iconbtn"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

export function ListHeader({
  title,
  count,
  onSearch,
  searchPlaceholder = "Search",
  actionLabel,
  onAction,
  children,
}) {
  return (
    <div className="ecms-listhead">
      <div className="ecms-listhead__title">
        <h2>{title}</h2>
        {count !== undefined && (
          <span className="ecms-listhead__count">{count || 0}</span>
        )}
      </div>
      <div className="ecms-listhead__tools">
        {children}
        {onSearch && (
          <label className="ecms-search">
            <FiSearch aria-hidden="true" />
            <input
              type="search"
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              onChange={(e) => onSearch(e.target.value)}
            />
          </label>
        )}
        {onAction && (
          <button
            type="button"
            className="btn btn-primary ecms-listhead__action"
            onClick={onAction}
          >
            <FiPlus aria-hidden="true" /> {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

// Column header that sorts the whole list. `sort` is { field, order }.
export function SortHeader({ field, sort, onSort, children, className }) {
  const active = sort.field === field;
  const ascending = active && sort.order === "asc";
  return (
    <th
      className={className}
      aria-sort={active ? (ascending ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        className={"ecms-sort" + (active ? " is-active" : "")}
        onClick={() => onSort({ field, order: ascending ? "desc" : "asc" })}
      >
        {children}
        {active ? (
          ascending ? (
            <HiChevronUp aria-hidden="true" />
          ) : (
            <HiChevronDown aria-hidden="true" />
          )
        ) : (
          <HiSelector aria-hidden="true" />
        )}
      </button>
    </th>
  );
}
