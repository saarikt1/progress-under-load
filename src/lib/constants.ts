export const DEFAULT_LIFTS = [
  "Bench Press (Barbell)",
  "Deadlift (Barbell)",
  "Overhead Press (Barbell)",
  "Squat (Barbell)",
] as const;

/**
 * Main lifts configuration - maps display names to exact exercise_keys
 */
export const MAIN_LIFTS: Record<string, string> = {
  "Squat": "squat (barbell)",
  "Bench Press": "bench press (barbell)",
  "Deadlift": "deadlift (barbell)",
  "Overhead Press": "overhead press (barbell)",
} as const;

/**
 * Time period options for dashboard filter
 */
export const TIME_PERIODS = {
  "3M": { label: "3 Months", months: 3 },
  "12M": { label: "12 Months", months: 12 },
  "ALL": { label: "All Time", months: null },
} as const;

export type TimePeriod = keyof typeof TIME_PERIODS;

