import React from "react";
import RoleLayout from "layouts/RoleLayout.js";
import admin_routes from "admin_routes.js";

function AdminLayout(props) {
  return <RoleLayout {...props} routes={admin_routes} />;
}

export default AdminLayout;
