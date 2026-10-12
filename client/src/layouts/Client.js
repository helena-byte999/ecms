import React from "react";
import RoleLayout from "layouts/RoleLayout.js";
import client_routes from "client_routes.js";

function ClientLayout(props) {
  return <RoleLayout {...props} routes={client_routes} />;
}

export default ClientLayout;
