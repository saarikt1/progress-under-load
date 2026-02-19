import { NextRequest, NextResponse } from "next/server";
import { MAIN_LIFTS } from "@/lib/constants";
import { findBest1RMPR, findHeaviestWeightPR, type WorkoutSet } from "@/lib/one-rm";
import {
  getAuthEnv,
  getCookieValue,
  getSessionByToken,
  getSessionCookieName,
} from "@/server/auth";

export const runtime = "edge";

const PR_WINDOW_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type ExerciseRow = {
  id: string;
  display_name: string;
  exercise_key: string;
};

type PRHighlightEvent = {
  exercise_id: string;
  exercise_key: string;
  display_name: string;
  pr_type: "heaviest_weight" | "estimated_1rm";
  weight_kg: number;
  reps: number;
  estimated_1rm_kg: number | null;
  achieved_at: string;
  workout_title: string;
};

function isWithinLastSevenDays(date: Date, nowMs: number) {
  const eventMs = date.getTime();
  const cutoffMs = nowMs - PR_WINDOW_DAYS * MS_PER_DAY;
  return eventMs >= cutoffMs && eventMs <= nowMs;
}

export async function GET(request: NextRequest) {
  try {
    const sessionToken = getCookieValue(request, getSessionCookieName());
    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const env = await getAuthEnv();
    const db = env.DB;

    const session = await getSessionByToken(db, sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mainLiftKeys = Object.values(MAIN_LIFTS);
    const placeholders = mainLiftKeys.map(() => "?").join(", ");

    const exercisesResult = await db
      .prepare(
        `SELECT id, display_name, exercise_key
         FROM exercises
         WHERE user_id = ? AND exercise_key IN (${placeholders})`
      )
      .bind(session.user.id, ...mainLiftKeys)
      .all<ExerciseRow>();

    const mainLiftSet = new Set(mainLiftKeys);
    const exercises = exercisesResult.results.filter((exercise) =>
      mainLiftSet.has(exercise.exercise_key)
    );

    const nowMs = Date.now();
    const events: PRHighlightEvent[] = [];

    for (const exercise of exercises) {
      const setsResult = await db
        .prepare(
          `SELECT id, end_time, start_time, workout_title, weight_kg, reps, set_type, rpe
           FROM sets
           WHERE exercise_id = ?
           ORDER BY end_time ASC`
        )
        .bind(exercise.id)
        .all<WorkoutSet>();

      const allSets = setsResult.results;
      if (allSets.length === 0) {
        continue;
      }

      const heaviestPR = findHeaviestWeightPR(allSets);
      if (heaviestPR && isWithinLastSevenDays(heaviestPR.date, nowMs)) {
        events.push({
          exercise_id: exercise.id,
          exercise_key: exercise.exercise_key,
          display_name: exercise.display_name,
          pr_type: "heaviest_weight",
          weight_kg: heaviestPR.weight,
          reps: heaviestPR.reps,
          estimated_1rm_kg: null,
          achieved_at: heaviestPR.date.toISOString(),
          workout_title: heaviestPR.workoutTitle,
        });
      }

      const estimated1RMPR = findBest1RMPR(allSets);
      if (
        estimated1RMPR &&
        estimated1RMPR.oneRM != null &&
        isWithinLastSevenDays(estimated1RMPR.date, nowMs)
      ) {
        events.push({
          exercise_id: exercise.id,
          exercise_key: exercise.exercise_key,
          display_name: exercise.display_name,
          pr_type: "estimated_1rm",
          weight_kg: estimated1RMPR.weight,
          reps: estimated1RMPR.reps,
          estimated_1rm_kg: estimated1RMPR.oneRM,
          achieved_at: estimated1RMPR.date.toISOString(),
          workout_title: estimated1RMPR.workoutTitle,
        });
      }
    }

    events.sort((a, b) => Date.parse(b.achieved_at) - Date.parse(a.achieved_at));

    return NextResponse.json({
      window_days: PR_WINDOW_DAYS,
      as_of: new Date(nowMs).toISOString(),
      events,
    });
  } catch (error) {
    console.error("Failed to fetch PR highlights:", error);
    return NextResponse.json(
      { error: "Failed to fetch PR highlights" },
      { status: 500 }
    );
  }
}
