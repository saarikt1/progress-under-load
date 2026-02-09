import { NextRequest, NextResponse } from "next/server";
import {
    getAuthEnv,
    getSessionByToken,
    getCookieValue,
    getSessionCookieName,
} from "@/server/auth";
import type { WorkoutSet } from "@/lib/one-rm";

export const runtime = "edge";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: exerciseId } = await params;

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

        // Get exercise info and verify ownership
        const exercise = await db
            .prepare(
                "SELECT id, display_name, exercise_key, user_id FROM exercises WHERE id = ?"
            )
            .bind(exerciseId)
            .first<{
                id: string;
                display_name: string;
                exercise_key: string;
                user_id: string;
            }>();

        if (!exercise) {
            return NextResponse.json(
                { error: "Exercise not found" },
                { status: 404 }
            );
        }

        if (exercise.user_id !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Parse period query param
        const { searchParams } = new URL(request.url);
        const period = searchParams.get("period") || "3m";

        // Calculate date range
        let dateFilter = "";
        const now = new Date();

        if (period === "3m") {
            const threeMonthsAgo = new Date(now);
            threeMonthsAgo.setMonth(now.getMonth() - 3);
            dateFilter = ` AND s.end_time >= '${threeMonthsAgo.toISOString()}'`;
        } else if (period === "12m") {
            const twelveMonthsAgo = new Date(now);
            twelveMonthsAgo.setMonth(now.getMonth() - 12);
            dateFilter = ` AND s.end_time >= '${twelveMonthsAgo.toISOString()}'`;
        }
        // "all" period has no date filter

        // Query all normal sets for this exercise within the period
        const setsResult = await db
            .prepare(
                `SELECT 
          s.id,
          s.end_time,
          s.start_time,
          s.workout_title,
          s.weight_kg,
          s.reps,
          s.set_type,
          s.rpe
        FROM sets s
        WHERE s.exercise_id = ? AND s.set_type = 'normal'${dateFilter}
        ORDER BY s.end_time ASC`
            )
            .bind(exerciseId)
            .all<WorkoutSet>();

        return NextResponse.json({
            exercise: {
                id: exercise.id,
                display_name: exercise.display_name,
                exercise_key: exercise.exercise_key,
            },
            sets: setsResult.results,
        });
    } catch (error) {
        console.error("Failed to fetch exercise detail:", error);
        return NextResponse.json(
            { error: "Failed to fetch exercise detail" },
            { status: 500 }
        );
    }
}
