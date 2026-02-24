import type { D1Database } from "@/server/auth";
import { findHeaviestWeightPR, findBest1RMPR } from "@/lib/one-rm";
import type { WorkoutSet } from "@/lib/one-rm";
import { MAIN_LIFTS } from "@/lib/constants";

type RecentSetRow = {
  end_time: string;
  workout_title: string | null;
  weight_kg: number;
  reps: number;
  exercise_notes: string | null;
  display_name: string;
};

type AllTimeSetRow = {
  id: string;
  end_time: string;
  start_time: string;
  workout_title: string;
  weight_kg: number | null;
  reps: number | null;
  set_type: string;
  rpe: number | null;
};

export async function buildChatSystemPrompt(
  db: D1Database,
  userId: string
): Promise<string> {
  // User's training program description
  const userRow = await db
    .prepare("SELECT program_prompt FROM users WHERE id = ?")
    .bind(userId)
    .first<{ program_prompt: string | null }>();

  const programPrompt = userRow?.program_prompt ?? null;

  // Last 5 distinct sessions: find the 5 most recent (workout_title, date) pairs
  const recentSessionKeys = await db
    .prepare(
      `SELECT DISTINCT workout_title, date(end_time) as session_date
       FROM sets
       WHERE user_id = ? AND set_type = 'normal'
         AND weight_kg IS NOT NULL AND reps IS NOT NULL
       ORDER BY session_date DESC
       LIMIT 5`
    )
    .bind(userId)
    .all<{ workout_title: string | null; session_date: string }>();

  let sessionsSummary = "No recent sessions found.";

  if (recentSessionKeys.results.length > 0) {
    // Fetch all sets for those sessions
    const conditions = recentSessionKeys.results
      .map(() => "(date(s.end_time) = ? AND (s.workout_title = ? OR (s.workout_title IS NULL AND ? IS NULL)))")
      .join(" OR ");

    const binds: (string | null)[] = [];
    for (const row of recentSessionKeys.results) {
      binds.push(row.session_date, row.workout_title, row.workout_title);
    }

    const recentSetsResult = await db
      .prepare(
        `SELECT s.end_time, s.workout_title, s.weight_kg, s.reps, s.exercise_notes, e.display_name
         FROM sets s
         JOIN exercises e ON e.id = s.exercise_id
         WHERE s.user_id = ? AND s.set_type = 'normal'
           AND s.weight_kg IS NOT NULL AND s.reps IS NOT NULL
           AND (${conditions})
         ORDER BY s.end_time ASC`
      )
      .bind(userId, ...binds)
      .all<RecentSetRow>();

    // Group sets into sessions
    const sessions = new Map<string, Map<string, { count: number; bestWeight: number; bestReps: number; notes: Set<string> }>>();
    const sessionOrder: string[] = [];

    for (const row of recentSetsResult.results) {
      const date = row.end_time.slice(0, 10);
      const sessionKey = `${row.workout_title ?? "Unknown session"}|${date}`;

      if (!sessions.has(sessionKey)) {
        sessions.set(sessionKey, new Map());
        sessionOrder.push(sessionKey);
      }

      const exercises = sessions.get(sessionKey)!;
      const existing = exercises.get(row.display_name);

      if (!existing) {
        const notes = new Set<string>();
        if (row.exercise_notes) notes.add(row.exercise_notes);
        exercises.set(row.display_name, { count: 1, bestWeight: row.weight_kg, bestReps: row.reps, notes });
      } else {
        existing.count += 1;
        if (row.exercise_notes) existing.notes.add(row.exercise_notes);
        if (
          row.weight_kg > existing.bestWeight ||
          (row.weight_kg === existing.bestWeight && row.reps > existing.bestReps)
        ) {
          existing.bestWeight = row.weight_kg;
          existing.bestReps = row.reps;
        }
      }
    }

    const sessionLines = sessionOrder.map((key) => {
      const [title, date] = key.split("|");
      const exercises = sessions.get(key)!;
      const exerciseLines = Array.from(exercises.entries())
        .map(([name, { count, bestWeight, bestReps, notes }]) => {
          const notePart = notes.size > 0 ? ` [${Array.from(notes).join("; ")}]` : "";
          return `  ${name}: ${count} set${count !== 1 ? "s" : ""}, best ${bestWeight}kg × ${bestReps}${notePart}`;
        })
        .join("\n");
      return `Session: ${title} (${date})\n${exerciseLines}`;
    });

    sessionsSummary = sessionLines.join("\n\n");
  }

  // All-time PRs for main lifts
  const prLines: string[] = [];
  for (const [liftName, exerciseKey] of Object.entries(MAIN_LIFTS)) {
    const exerciseRow = await db
      .prepare("SELECT id FROM exercises WHERE user_id = ? AND exercise_key = ?")
      .bind(userId, exerciseKey)
      .first<{ id: string }>();

    if (!exerciseRow) continue;

    const allSetsResult = await db
      .prepare(
        `SELECT id, end_time, start_time, workout_title, weight_kg, reps, set_type, rpe
         FROM sets
         WHERE user_id = ? AND exercise_id = ? AND set_type = 'normal'
           AND weight_kg IS NOT NULL AND reps IS NOT NULL`
      )
      .bind(userId, exerciseRow.id)
      .all<AllTimeSetRow>();

    const allSets: WorkoutSet[] = allSetsResult.results.map((r) => ({
      id: r.id,
      end_time: r.end_time,
      start_time: r.start_time,
      workout_title: r.workout_title,
      weight_kg: r.weight_kg,
      reps: r.reps,
      set_type: r.set_type,
      rpe: r.rpe,
    }));

    const heaviestPR = findHeaviestWeightPR(allSets);
    const best1RMPR = findBest1RMPR(allSets);

    if (heaviestPR) {
      prLines.push(
        `${liftName}: heaviest set ${heaviestPR.weight}kg × ${heaviestPR.reps} reps` +
          (best1RMPR ? `, est. 1RM ${best1RMPR.oneRM}kg` : "")
      );
    }
  }

  const prSection =
    prLines.length > 0
      ? `All-time personal records for main lifts:\n${prLines.join("\n")}`
      : "No main lift PR data yet.";

  const programSection = programPrompt
    ? `The user's training program:\n${programPrompt}`
    : "The user has not described their training program yet.";

  return [
    "You are a highly analytical and encouraging strength coach.",
    "Answer questions concisely and helpfully based on the user's training data below.",
    "",
    programSection,
    "",
    prSection,
    "",
    "Recent training sessions (last 5):",
    sessionsSummary,
  ].join("\n");
}
