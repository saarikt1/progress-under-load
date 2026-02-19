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
    has_recent_pr: boolean;
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

        // For each exercise, get the latest 1RM estimate and PR detection
        for (const exercise of result.results) {
            let latest1RM: number | null = null;

            const stats = await db
                .prepare(
                    `SELECT
                        (SELECT weight_kg FROM sets WHERE exercise_id=?1 AND set_type='normal'
                         AND weight_kg IS NOT NULL AND reps IS NOT NULL ORDER BY end_time DESC LIMIT 1) as latest_weight,
                        (SELECT reps FROM sets WHERE exercise_id=?1 AND set_type='normal'
                         AND weight_kg IS NOT NULL AND reps IS NOT NULL ORDER BY end_time DESC LIMIT 1) as latest_reps,
                        MAX(weight_kg) as all_time_max,
                        MAX(CASE WHEN end_time >= datetime('now', '-7 days') THEN weight_kg END) as recent_7d_max
                    FROM sets WHERE exercise_id = ?1 AND set_type = 'normal'`
                )
                .bind(exercise.id)
                .first<{
                    latest_weight: number | null;
                    latest_reps: number | null;
                    all_time_max: number | null;
                    recent_7d_max: number | null;
                }>();

            if (stats?.latest_weight && stats?.latest_reps) {
                const oneRM = calculate1RMRange(stats.latest_weight, stats.latest_reps);
                latest1RM = oneRM.avg;
            }

            const hasRecentPR =
                stats?.recent_7d_max != null &&
                stats?.all_time_max != null &&
                stats.recent_7d_max >= stats.all_time_max;

            exercises.push({
                id: exercise.id,
                display_name: exercise.display_name,
                exercise_key: exercise.exercise_key,
                total_sets: exercise.total_sets,
                last_session: exercise.last_session,
                latest_1rm: latest1RM,
                has_recent_pr: hasRecentPR,
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
