import React from "react";
import RoleLayout from "layouts/RoleLayout.js";
import family_routes from "family_routes.js";

function FamilyLayout(props) {
  return <RoleLayout {...props} routes={family_routes} />;
}

export default FamilyLayout;
