/** Planned data sources. None are implemented; the UI must say so. */
export const INTEGRATIONS = [
  { name: "Apple Health", helps: "Workouts, sleep and mindful minutes", match: /strength|gym|weights|cardio|run|walk|cycl|swim|workout|steps|sleep|meditat/i },
  { name: "Google Health Connect", helps: "Workouts, steps and sleep on Android", match: /strength|gym|weights|cardio|run|walk|cycl|swim|workout|steps|sleep/i },
  { name: "Strava", helps: "Runs, rides and swims", match: /cardio|run|ride|cycl|swim|walk/i },
  { name: "Oura", helps: "Sleep and recovery", match: /sleep|recover|rest/i },
] as const;
