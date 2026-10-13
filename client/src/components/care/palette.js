// Chart and status colours, matching the tokens in assets/scss/ecms-theme.scss.
// Teal and blue were checked for colour-blind separation; outcomes also differ in
// lightness and always come with a legend.
export const PALETTE = {
  teal: "#0a9e94",
  blue: "#2a78d6",
  prev: "#b9c3cd",
  amber: "#e3a23b",
  red: "#d1495b",
  slate: "#6b7a8c",
  violet: "#6a4fc0",
  grid: "#eef1f4",
  axis: "#94a3b8",
  ink: "#1d2b3f",
};

// Dose outcomes, in the order they're stacked
export const OUTCOME_SERIES = [
  { key: "given", label: "Given", color: PALETTE.teal },
  { key: "refused", label: "Refused", color: PALETTE.amber },
  { key: "missed", label: "Missed", color: PALETTE.red },
  { key: "not_recorded", label: "Not recorded", color: PALETTE.slate },
];

export const MOOD_COLORS = {
  content: PALETTE.teal,
  settled: PALETTE.blue,
  drowsy: PALETTE.violet,
  low: PALETTE.slate,
  anxious: PALETTE.amber,
  agitated: PALETTE.red,
};

export const INCIDENT_COLORS = {
  fall: PALETTE.red,
  injury: PALETTE.amber,
  skin: PALETTE.violet,
  behaviour: PALETTE.blue,
  medication: PALETTE.slate,
  other: PALETTE.prev,
};
