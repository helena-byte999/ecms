import Dashboard from "views/admin/Dashboard.js";
import CareGiver from "views/admin/CareGiver.js";
import Client from "views/admin/Client.js";
import Schedule from "views/admin/Schedule.js";
import Invoice from "views/admin/Invoice.js";
import Contract from "views/admin/Contract";
import UserPage from "views/admin/User.js";
import CareHome from "views/care/CareHome.js";
import ResidentCare from "views/care/ResidentCare.js";
import CareAnalytics from "views/care/CareAnalytics.js";
import { TeamAdmins } from "components/care/people.js";
import HealthIcon from "components/HealthIcon.js";

var routes = [
  {
    path: "/dashboard",
    name: "Dashboard",
    icon_comp: <HealthIcon name="home" size={22} />,
    component: Dashboard,
    layout: "/admin",
  },
  // Care: today's round and residents (tabs), analytics, and each resident's record.
  // More specific paths come first so they match before /care.
  {
    path: "/care/analytics",
    name: "Care analytics",
    component: CareAnalytics,
    layout: "/admin",
    hidden: true,
  },
  {
    path: "/care/:id",
    name: "Care",
    component: ResidentCare,
    layout: "/admin",
    hidden: true,
  },
  {
    path: "/care",
    name: "Care",
    icon_comp: <HealthIcon name="heartbeat" size={22} />,
    component: CareHome,
    layout: "/admin",
  },
  // People: residents, caregivers and admins (tabs)
  {
    path: "/people/caregivers",
    name: "Caregivers",
    component: CareGiver,
    layout: "/admin",
    hidden: true,
  },
  {
    path: "/people/admins",
    name: "Admins",
    component: TeamAdmins,
    layout: "/admin",
    hidden: true,
  },
  {
    path: "/people",
    name: "People",
    icon_comp: <HealthIcon name="people" size={22} />,
    component: Client,
    layout: "/admin",
  },
  {
    path: "/contracts",
    name: "Contracts",
    icon_comp: <HealthIcon name="contract" size={22} />,
    component: Contract,
    layout: "/admin",
  },
  {
    path: "/rota",
    name: "Rota",
    icon_comp: <HealthIcon name="calendar" size={22} />,
    component: Schedule,
    layout: "/admin",
  },
  {
    path: "/invoices",
    name: "Invoices",
    icon_comp: <HealthIcon name="bills" size={22} />,
    component: Invoice,
    layout: "/admin",
  },
  // in the account menu (top right), not the sidebar
  {
    path: "/user-page",
    name: "Your profile",
    component: UserPage,
    layout: "/admin",
    hidden: true,
  },
];
export default routes;
