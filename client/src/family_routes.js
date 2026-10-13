import Contracts from "views/client/Contract";
import Dashboard from "views/client/Dashboard.js";
import Invoice from "views/client/Invoice.js";
import UserPage from "views/client/User.js";
import ResidentCare from "views/care/ResidentCare.js";
import { FaHeartbeat } from "react-icons/fa";

// Family members see their resident's records, read only (the views show the
// linked resident; see components/care/useSubject.js)
var routes = [
  {
    path: "/dashboard",
    name: "Dashboard",
    icon: "nc-icon nc-bank",
    component: Dashboard,
    layout: "/family",
  },
  {
    path: "/care",
    name: "Care",
    icon_comp: <FaHeartbeat size={24} />,
    component: ResidentCare,
    layout: "/family",
  },
  {
    path: "/invoices",
    name: "Invoices",
    icon: "nc-icon nc-tile-56",
    component: Invoice,
    layout: "/family",
  },
  {
    path: "/contracts",
    name: "Contract",
    icon: "nc-icon nc-tile-56",
    component: Contracts,
    layout: "/family",
  },
  {
    path: "/user-page",
    name: "User Profile",
    icon: "nc-icon nc-single-02",
    component: UserPage,
    layout: "/family",
  },
];
export default routes;
