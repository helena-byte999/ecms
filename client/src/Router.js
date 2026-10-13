import React, { lazy, Suspense } from "react";
import { BrowserRouter, Route, Switch, Redirect } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";

import Home from "views/home/Home.js";
import LoginPage from "./views/auth/Login";
import Loader from "components/Loader.js";

// Each role's area loads only after sign-in, so the landing page stays small
const AdminLayout = lazy(() => import("layouts/Admin.js"));
const ClientLayout = lazy(() => import("layouts/Client"));
const CaregiverLayout = lazy(() => import("layouts/Caregiver"));
const FamilyLayout = lazy(() => import("layouts/Family"));

const roleLayouts = {
  admin: AdminLayout,
  client: ClientLayout,
  caregiver: CaregiverLayout,
  family: FamilyLayout,
};

function RouterComp() {
  const { loggedIn, userDetail } = useAuth();
  // only the logged-in user's own area is routable
  const role = loggedIn ? userDetail.role : undefined;
  const Layout = roleLayouts[role];

  return (
    <BrowserRouter>
      <Suspense fallback={<Loader />}>
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
      </Suspense>
    </BrowserRouter>
  );
}

export default RouterComp;
