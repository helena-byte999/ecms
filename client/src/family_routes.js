import Contracts from "views/family/Contract";
import Dashboard from "views/family/Dashboard.js";
import Invoice from "views/family/Invoice.js";
import UserPage from "views/family/User.js";
import ResidentCare from "views/care/ResidentCare.js";
import HealthIcon from "components/HealthIcon.js";

// Family members see their resident's records, read only (the views show the
// linked resident; see components/care/useSubject.js)
var routes = [
  {
    path: "/dashboard",
    icon_comp: <HealthIcon name="home" size={22} />,
    name: "Dashboard",
    component: Dashboard,
    layout: "/family",
  },
  {
    path: "/care",
    icon_comp: <HealthIcon name="heartbeat" size={22} />,
    name: "Care",
    component: ResidentCare,
    layout: "/family",
  },
  {
    path: "/invoices",
    icon_comp: <HealthIcon name="bills" size={22} />,
    name: "Invoices",
    component: Invoice,
    layout: "/family",
  },
  {
    path: "/contracts",
    icon_comp: <HealthIcon name="contract" size={22} />,
    name: "Contracts",
    component: Contracts,
    layout: "/family",
  },
  // in the account menu (top right), not the sidebar
  {
    path: "/user-page",
    name: "Your profile",
    component: UserPage,
    layout: "/family",
    hidden: true,
  },
];
export default routes;
