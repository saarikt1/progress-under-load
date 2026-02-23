import type { AuthEnv, D1Database } from "@/server/auth";
import { generateText } from "@/server/llm";
import { findHeaviestWeightPR, findBest1RMPR } from "@/lib/one-rm";
import type { WorkoutSet } from "@/lib/one-rm";
import { MAIN_LIFTS } from "@/lib/constants";
import promptTemplate from "./coach-prompt";

type ImportRow = {
  source_filename: string | null;
  rows_inserted: number;
  max_end_time_seen: string | null;
};

type WindowSetRow = {
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

export async function buildCoachContext(
  db: D1Database,
  userId: string,
  importId: string
): Promise<string> {
  const importRow = await db
    .prepare(
      "SELECT source_filename, rows_inserted, max_end_time_seen FROM imports WHERE id = ? AND user_id = ?"
    )
    .bind(importId, userId)
    .first<ImportRow>();

  const currentMax = importRow?.max_end_time_seen ?? null;

  // Find the previous import's max_end_time_seen to bound the window
  const prevImport = await db
    .prepare(
      `SELECT max_end_time_seen FROM imports
       WHERE user_id = ? AND uploaded_at < (SELECT uploaded_at FROM imports WHERE id = ?)
       ORDER BY uploaded_at DESC LIMIT 1`
    )
    .bind(userId, importId)
    .first<{ max_end_time_seen: string | null }>();

  const prevMax = prevImport?.max_end_time_seen ?? null;

  // Fetch all normal sets in the upload window (no row limit — session grouping keeps prompt compact)
  const windowSetsResult = await db
    .prepare(
      `SELECT s.end_time, s.workout_title, s.weight_kg, s.reps, s.exercise_notes, e.display_name
       FROM sets s
       JOIN exercises e ON e.id = s.exercise_id
       WHERE s.user_id = ?
         AND s.set_type = 'normal'
         AND s.weight_kg IS NOT NULL AND s.reps IS NOT NULL
         AND (? IS NULL OR s.end_time <= ?)
         AND (? IS NULL OR s.end_time > ?)
       ORDER BY s.end_time ASC`
    )
    .bind(userId, currentMax, currentMax, prevMax, prevMax)
    .all<WindowSetRow>();

  // Group sets into sessions, then summarise per exercise within each session
  const sessions = new Map<string, Map<string, { count: number; bestWeight: number; bestReps: number; notes: Set<string> }>>();
  const sessionOrder: string[] = [];

  for (const row of windowSetsResult.results) {
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

  const importSummary = [
    `- File: ${importRow?.source_filename ?? "unknown"}`,
    `- New sets recorded: ${importRow?.rows_inserted ?? 0}`,
    `- Latest workout date: ${currentMax ?? "unknown"}`,
  ].join("\n");

  const prData = prLines.length > 0 ? prLines.join("\n") : "No main lift data yet.";
  const sessionsSummary = sessionLines.length > 0 ? sessionLines.join("\n") : "No sessions found.";

  return promptTemplate
    .replace("{{IMPORT_SUMMARY}}", importSummary)
    .replace("{{PR_DATA}}", prData)
    .replace("{{SESSIONS}}", sessionsSummary);
}

export async function generateAndStoreCoachComment(
  db: D1Database,
  userId: string,
  importId: string,
  env: AuthEnv
): Promise<string> {
  const prompt = await buildCoachContext(db, userId, importId);
  const comment = await generateText(prompt, env);
  const now = new Date().toISOString();

  await db
    .prepare(
      "UPDATE imports SET coach_comment = ?, coach_comment_generated_at = ? WHERE id = ? AND user_id = ?"
    )
    .bind(comment, now, importId, userId)
    .run();

  return comment;
}
