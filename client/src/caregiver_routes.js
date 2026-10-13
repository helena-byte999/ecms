import Contracts from "views/caregiver/Contract";
import Dashboard from "views/caregiver/Dashboard.js";
import Invoice from "views/caregiver/Invoice.js";
import UserPage from "views/caregiver/User.js";
import CareHome from "views/care/CareHome.js";
import ResidentCare from "views/care/ResidentCare.js";
import { FaHeartbeat } from "react-icons/fa";

var routes = [
  {
    path: "/dashboard",
    name: "Dashboard",
    icon: "nc-icon nc-bank",
    component: Dashboard,
    layout: "/caregiver",
  },
  {
    path: "/care/:id",
    name: "Care",
    component: ResidentCare,
    layout: "/caregiver",
    hidden: true,
  },
  {
    path: "/care",
    name: "Care",
    icon_comp: <FaHeartbeat size={24} />,
    component: CareHome,
    layout: "/caregiver",
  },
  {
    path: "/invoices",
    name: "Invoices",
    icon: "nc-icon nc-tile-56",
    component: Invoice,
    layout: "/caregiver",
  },
  {
    path: "/contracts",
    name: "Contracts",
    icon: "nc-icon nc-tile-56",
    component: Contracts,
    layout: "/caregiver",
  },
  {
    path: "/user-page",
    name: "User Profile",
    icon: "nc-icon nc-single-02",
    component: UserPage,
    layout: "/caregiver",
  },
];
export default routes;
