import React from "react";
import { BrowserRouter, Route, Switch, Redirect } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";

import AdminLayout from "layouts/Admin.js";
import ClientLayout from "layouts/Client";
import CaregiverLayout from "layouts/Caregiver";
import Home from "views/home/Home.js";
import LoginPage from "./views/auth/Login";

const roleLayouts = {
  admin: AdminLayout,
  client: ClientLayout,
  caregiver: CaregiverLayout,
};

function RouterComp() {
  const { loggedIn, userDetail } = useAuth();
  // only the logged-in user's own area is routable
  const role = loggedIn ? userDetail.role : undefined;
  const Layout = roleLayouts[role];

  return (
    <BrowserRouter>
      <Switch>
        {/* Public routes */}
        <Route exact path="/" component={Home} />
        <Route path="/login" component={LoginPage} />

        {/* Protected routes: deep links like /admin/invoice load directly */}
        {Layout && (
          <Redirect exact from={`/${role}`} to={`/${role}/dashboard`} />
        )}
        {Layout && <Route path={`/${role}`} component={Layout} />}

        {/* Fallback: your own dashboard if logged in, otherwise the homepage */}
        <Redirect to={Layout ? `/${role}/dashboard` : "/"} />
      </Switch>
    </BrowserRouter>
  );
}

export default RouterComp;
