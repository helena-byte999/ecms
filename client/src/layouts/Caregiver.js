import React from "react";
import RoleLayout from "layouts/RoleLayout.js";
import caregiver_routes from "caregiver_routes.js";

function CaregiverLayout(props) {
  return <RoleLayout {...props} routes={caregiver_routes} />;
}

export default CaregiverLayout;
