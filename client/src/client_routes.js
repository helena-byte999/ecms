import Contracts from "views/client/Contract";
import Dashboard from "views/client/Dashboard.js";
import Invoice from "views/client/Invoice.js";
import UserPage from "views/client/User.js";
import ResidentCare from "views/care/ResidentCare.js";
import HealthIcon from "components/HealthIcon.js";

var routes = [
  {
    path: "/dashboard",
    icon_comp: <HealthIcon name="home" size={22} />,
    name: "Dashboard",
    component: Dashboard,
    layout: "/client",
  },
  {
    path: "/care",
    icon_comp: <HealthIcon name="heartbeat" size={22} />,
    name: "Care",
    component: ResidentCare,
    layout: "/client",
  },
  {
    path: "/invoices",
    icon_comp: <HealthIcon name="bills" size={22} />,
    name: "Invoices",
    component: Invoice,
    layout: "/client",
  },
  {
    path: "/contracts",
    icon_comp: <HealthIcon name="contract" size={22} />,
    name: "Contracts",
    component: Contracts,
    layout: "/client",
  },
  {
    path: "/user-page",
    icon_comp: <HealthIcon name="profile" size={22} />,
    name: "User Profile",
    component: UserPage,
    layout: "/client",
  },
];
export default routes;
