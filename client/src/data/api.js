const BackEnd = process.env.REACT_APP_BackEndHost;
// Only addresses the API actually serves (see server/routes/api)
export const schedule = {
  addSchedule: `${BackEnd}/api/schedule/add_schedule`,
  showAllSchedules: `${BackEnd}/api/schedule/show_all_schedules`,
};

export const invoice_api = {
  //take in a body with data
  //data :
  addInvoice: `${BackEnd}/api/invoice/add_invoice`,
  updateInvoice: `${BackEnd}/api/invoice/update_invoice`,
  //---------------------------------------------------------------------------------------------------

  showInvoices: `${BackEnd}/api/invoice/show_invoices`,
  showInvoice: `${BackEnd}/api/invoice/show_invoice`,
  // per-month invoiced vs paid, for the admin dashboard chart
  summary: `${BackEnd}/api/invoice/summary`,
  //---------------------------------------------------------------------------------------------------
};

export const user = {
  addUser: `${BackEnd}/api/user/add_user`,
  updateUser: `${BackEnd}/api/user/update_user`,
  getCounts: `${BackEnd}/api/user/get_counts`,
  showUsers: `${BackEnd}/api/user/show_users`,
  showAllContracts: `${BackEnd}/api/user/show_all_contracts`,
  showUserByEmail: `${BackEnd}/api/user/show_user_by_email`,
  setStatus: `${BackEnd}/api/user/set_status`,
  // family members linked to a resident: GET /family/:residentId
  family: `${BackEnd}/api/user/family`,
};

// Care records: residents, today's medicine round, and per resident
// (`${care.resident}/${id}/entries | medications | visits | summary`)
export const care = {
  residents: `${BackEnd}/api/care/residents`,
  round: `${BackEnd}/api/care/round`,
  report: `${BackEnd}/api/care/report`,
  resident: `${BackEnd}/api/care`,
};
export const authenticate = {
  // is the saved token still valid?
  loggedIn: `${BackEnd}/api/user/loggedIn`,
  // the signed-in user (family members also get their resident)
  getUserData: `${BackEnd}/api/auth/user`,
  // sign in with email and password
  userAuth: `${BackEnd}/api/auth`,
  // one-click demo sign-in ({ role }), demo deployments only
  demoAuth: `${BackEnd}/api/auth/demo`,
  // change your own password ({ current_password, new_password })
  changePassword: `${BackEnd}/api/auth/change_password`,
};
