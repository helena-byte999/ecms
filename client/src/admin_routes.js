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
    icon_comp: <HealthIcon name="home" size={22} />,
    name: "Dashboard",
    component: Dashboard,
    layout: "/admin",
  },
  // a resident's care record (not in the menu; listed before /care so it matches first)
  {
    path: "/care/:id",
    name: "Care",
    component: ResidentCare,
    layout: "/admin",
    hidden: true,
  },
  {
    path: "/care",
    icon_comp: <HealthIcon name="heartbeat" size={22} />,
    name: "Care",
    component: CareHome,
    layout: "/admin",
  },
  {
    path: "/analytics",
    icon_comp: <HealthIcon name="chartLine" size={22} />,
    name: "Care analytics",
    component: CareAnalytics,
    layout: "/admin",
  },
  {
    path: "/invoice",
    icon_comp: <HealthIcon name="bills" size={22} />,
    name: "Invoice",
    component: Invoice,
    layout: "/admin",
  },
  {
    path: "/caregiver",
    icon_comp: <HealthIcon name="nurse" size={22} />,
    name: "Care Givers",
    component: CareGiver,
    layout: "/admin",
  },
  {
    path: "/clients",
    icon_comp: <HealthIcon name="elderly" size={22} />,
    name: "Clients",
    component: Client,
    layout: "/admin",
  },
  {
    path: "/contract",
    icon_comp: <HealthIcon name="contract" size={22} />,
    name: "Contract",
    component: Contract,
    layout: "/admin",
  },
  {
    path: "/schedule",
    icon_comp: <HealthIcon name="calendar" size={22} />,
    name: "Schedule",
    component: Schedule,
    layout: "/admin",
  },
  {
    path: "/team",
    icon_comp: <HealthIcon name="people" size={22} />,
    name: "Team admins",
    component: TeamAdmins,
    layout: "/admin",
  },
  {
    path: "/user-page",
    icon_comp: <HealthIcon name="profile" size={22} />,
    name: "User Profile",
    component: UserPage,
    layout: "/admin",
  },
];
export default routes;
