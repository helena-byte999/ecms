import React from "react";
import { Link, useLocation } from "react-router-dom";

// Tabs that are links between the pages of one menu section (e.g. People:
// residents, caregivers, admins). A tab is active when the address matches it.
function SectionTabs({ label, tabs }) {
  const { pathname, search } = useLocation();
  const here = pathname + search;
  return (
    <nav className="ecms-tabs ecms-sectiontabs" aria-label={label}>
      {tabs.map((t) => {
        const active = t.match ? t.match(pathname, search) : here === t.to;
        return (
          <Link key={t.to} to={t.to} className={"ecms-tab" + (active ? " is-active" : "")} aria-current={active ? "page" : undefined}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

export const careTabs = (layout, isAdmin) => [
  { to: `${layout}/care`, label: "Today's round", match: (p, s) => p === `${layout}/care` && !/tab=residents/.test(s) },
  { to: `${layout}/care?tab=residents`, label: "Residents", match: (p, s) => p === `${layout}/care` && /tab=residents/.test(s) },
  ...(isAdmin ? [{ to: `${layout}/care/analytics`, label: "Analytics" }] : []),
];

export const peopleTabs = [
  { to: "/admin/people", label: "Residents" },
  { to: "/admin/people/caregivers", label: "Caregivers" },
  { to: "/admin/people/admins", label: "Admins" },
];

export default SectionTabs;
