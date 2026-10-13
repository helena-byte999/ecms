// Words shown for the values stored in care records
export const MEALS = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack", drink: "Drink" };
export const EATEN = { all: "Ate all", most: "Ate most", half: "Ate about half", little: "Ate a little", none: "Ate nothing" };
export const TASKS = {
  wash: "Wash", shower: "Shower or bath", dress: "Dressed", oral_care: "Teeth or dentures", continence: "Continence care",
  reposition: "Repositioned", hair: "Hair", nails: "Nails", skin_check: "Skin check",
};
export const MOODS = { content: "Content", settled: "Settled", low: "Low", anxious: "Anxious", agitated: "Agitated", drowsy: "Drowsy" };
export const INCIDENTS = { fall: "Fall", injury: "Injury", skin: "Skin damage", behaviour: "Behaviour", medication: "Medicine error", other: "Other" };
export const SEVERITY = { minor: "Minor", moderate: "Moderate", serious: "Serious" };
export const ENTRY_TYPES = {
  meal: "Meal or drink", care: "Personal care", wellbeing: "Wellbeing", activity: "Activity",
  incident: "Incident", note: "Note", dose: "Medicine", visit: "Doctor's visit",
};
export const CHANGE_FIELDS = { allergy: "Allergies", conditions: "Conditions" };

// Dose outcomes and round statuses: [label, tone]
export const DOSE = {
  given: ["Given", "ok"],
  refused: ["Refused", "warn"],
  missed: ["Missed", "bad"],
  due: ["Due", "neutral"],
  late: ["Late", "bad"],
  upcoming: ["Later", "muted"],
  not_recorded: ["Not recorded", "bad"],
};

export const fullName = (p) => [p?.first_name, p?.last_name].filter(Boolean).join(" ");

export function age(dob) {
  if (!dob) return null;
  const d = new Date(dob + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) a--;
  return a;
}

export const timeOf = (at) =>
  new Date(at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

// "Today", "Yesterday" or "Mon 12 Oct"
export function dayLabel(at) {
  const d = new Date(at);
  const today = new Date();
  const key = (x) => x.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (key(d) === key(today)) return "Today";
  if (key(d) === key(yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

// YYYY-MM-DD in the browser's time zone (the care home's, in practice)
export function ymd(d = new Date()) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}
export const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return ymd(d);
};
