import Contracts from "views/caregiver/Contract";
import Dashboard from "views/caregiver/Dashboard.js";
import Invoice from "views/caregiver/Invoice.js";
import UserPage from "views/caregiver/User.js";
import CareHome from "views/care/CareHome.js";
import ResidentCare from "views/care/ResidentCare.js";
import HealthIcon from "components/HealthIcon.js";

var routes = [
  {
    path: "/dashboard",
    icon_comp: <HealthIcon name="home" size={22} />,
    name: "Dashboard",
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
    icon_comp: <HealthIcon name="heartbeat" size={22} />,
    name: "Care",
    component: CareHome,
    layout: "/caregiver",
  },
  {
    path: "/invoices",
    icon_comp: <HealthIcon name="bills" size={22} />,
    name: "Invoices",
    component: Invoice,
    layout: "/caregiver",
  },
  {
    path: "/contracts",
    icon_comp: <HealthIcon name="contract" size={22} />,
    name: "Contracts",
    component: Contracts,
    layout: "/caregiver",
  },
  {
    path: "/user-page",
    icon_comp: <HealthIcon name="profile" size={22} />,
    name: "User Profile",
    component: UserPage,
    layout: "/caregiver",
  },
];
export default routes;
