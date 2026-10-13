import { useAuth } from "contexts/AuthContext";

// Whose records a page shows: a family member sees the resident they're linked
// to; everyone else sees themselves.
export function useSubject() {
  const { userDetail } = useAuth();
  if (userDetail.role === "family" && userDetail.resident) {
    return { ...userDetail.resident, id: userDetail.resident._id, isFamily: true, viewer: userDetail };
  }
  return { ...userDetail, id: userDetail._id, isFamily: false, viewer: userDetail };
}

export const isStaff = (role) => role === "admin" || role === "caregiver";
