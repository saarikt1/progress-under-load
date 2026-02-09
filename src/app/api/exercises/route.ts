import { NextRequest, NextResponse } from "next/server";
import {
    getAuthEnv,
    getSessionByToken,
    getCookieValue,
    getSessionCookieName,
} from "@/server/auth";
import { calculate1RMRange } from "@/lib/one-rm";

export const runtime = "edge";

interface ExerciseSummary {
    id: string;
    display_name: string;
    exercise_key: string;
    total_sets: number;
    last_session: string | null;
    latest_1rm: number | null;
}

export async function GET(request: NextRequest) {
    try {
        // Get auth environment and DB
        const env = await getAuthEnv();
        const db = env.DB;

        // Validate session
        const sessionToken = getCookieValue(request, getSessionCookieName());
        if (!sessionToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const session = await getSessionByToken(db, sessionToken);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Query exercises with aggregated stats
        const result = await db
            .prepare(
                `SELECT 
          e.id,
          e.display_name,
          e.exercise_key,
          COUNT(s.id) as total_sets,
          MAX(s.end_time) as last_session
        FROM exercises e
        LEFT JOIN sets s ON s.exercise_id = e.id AND s.set_type = 'normal'
        WHERE e.user_id = ?
        GROUP BY e.id
        ORDER BY total_sets DESC`
            )
            .bind(session.user.id)
            .all<{
                id: string;
                display_name: string;
                exercise_key: string;
                total_sets: number;
                last_session: string | null;
            }>();

        const exercises: ExerciseSummary[] = [];

        // For each exercise, get the latest 1RM estimate
        for (const exercise of result.results) {
            let latest1RM: number | null = null;

            // Get the most recent normal set with weight and reps
            const latestSet = await db
                .prepare(
                    `SELECT weight_kg, reps
           FROM sets
           WHERE exercise_id = ? AND set_type = 'normal' AND weight_kg IS NOT NULL AND reps IS NOT NULL
           ORDER BY end_time DESC
           LIMIT 1`
                )
                .bind(exercise.id)
                .first<{ weight_kg: number; reps: number }>();

            if (latestSet) {
                const oneRM = calculate1RMRange(latestSet.weight_kg, latestSet.reps);
                latest1RM = oneRM.avg;
            }

            exercises.push({
                id: exercise.id,
                display_name: exercise.display_name,
                exercise_key: exercise.exercise_key,
                total_sets: exercise.total_sets,
                last_session: exercise.last_session,
                latest_1rm: latest1RM,
            });
        }

        return NextResponse.json({ exercises });
    } catch (error) {
        console.error("Failed to fetch exercises:", error);
        return NextResponse.json(
            { error: "Failed to fetch exercises" },
            { status: 500 }
        );
    }
}
