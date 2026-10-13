import Contracts from "views/client/Contract";
import Dashboard from "views/client/Dashboard.js";
import Invoice from "views/client/Invoice.js";
import UserPage from "views/client/User.js";
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
    name: "Contract",
    component: Contracts,
    layout: "/family",
  },
  {
    path: "/user-page",
    icon_comp: <HealthIcon name="profile" size={22} />,
    name: "User Profile",
    component: UserPage,
    layout: "/family",
  },
];
export default routes;
