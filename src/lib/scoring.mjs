// The league's scoring catalog -- one source of truth for the Rules page, the
// moderator entry form, and the category grouping the DB derives totals from.
// Kept .mjs so it's importable from both server and client without pulling in
// any server-only module. Point values here are the defaults the moderator form
// pre-fills; a moderator may override the number (entry method: "both").

/** @typedef {"office_hours"|"studying"|"workout"|"exam"|"im_sport"} Category */

// Categories that feed the weekly matchup (summed per team / members). Everything
// else is season-direct (added straight to the season total / members).
export const WEEKLY_CATEGORIES = ["office_hours", "studying", "workout"];
export const isWeeklyCategory = (c) => WEEKLY_CATEGORIES.includes(c);

// Each activity a moderator can log: its label, the category it belongs to, and
// the default point value.
export const ACTIVITIES = [
  { key: "office_hours", label: "Office Hours/job related to your career", category: "office_hours", points: 0.4 },
  { key: "studying",     label: "Studying with brother(s)",                category: "studying",     points: 0.2 },
  { key: "workout",      label: "Workout",                                 category: "workout",      points: 0.2 },
  { key: "exam_a",       label: "A on Exam",                               category: "exam",         points: 2 },
  { key: "exam_b",       label: "B on Exam",                               category: "exam",         points: 1 },
  { key: "im_sport",     label: "IM Sport Enrollment",                     category: "im_sport",     points: 3 },
];

export const WEEKLY_ACTIVITIES = ACTIVITIES.filter((a) => isWeeklyCategory(a.category));
export const SEASON_ACTIVITIES = ACTIVITIES.filter((a) => !isWeeklyCategory(a.category));

// Short labels for showing a logged entry's category (several activities can map
// to one category, e.g. A/B on Exam -> exam).
export const CATEGORY_LABELS = {
  office_hours: "Office Hours",
  studying: "Studying",
  workout: "Workout",
  exam: "Exam",
  im_sport: "IM Sport",
};

