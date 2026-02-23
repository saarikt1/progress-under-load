import type { ParsedRow } from "./csv-parser";
import { normalizeExerciseKey } from "./csv-parser";
import type { D1Database } from "./auth";

/**
 * Result of a CSV import operation
 */
export interface ImportResult {
    importId: string;
    rowsSeen: number;
    rowsInserted: number;
    maxEndTimeSeen: string;
    errors: string[];
}

/**
 * Generate a stable hash for a source row (for deduplication)
 * Uses Web Crypto API which is compatible with Edge Runtime
 */
export async function generateSourceRowHash(row: ParsedRow): Promise<string> {
    // Concatenate fields in a stable order
    const parts = [
        row.endTime.toISOString(),
        row.startTime.toISOString(),
        row.title,
        row.exerciseTitle,
        row.setIndex.toString(),
        row.setType,
        row.weightKg?.toString() ?? "",
        row.reps?.toString() ?? "",
        row.rpe?.toString() ?? "",
        row.distanceKm?.toString() ?? "",
        row.durationSeconds?.toString() ?? "",
        row.exerciseNotes ?? "",
    ];

    const data = parts.join("|");
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    // Use Web Crypto API for hashing
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
}

/**
 * Generate a UUID using Web Crypto API
 */
function createUUID(): string {
    if (typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    // Fallback UUID v4 generation
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);

    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant

    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Import CSV data for a user with idempotent behavior
 */
export async function importCSV(
    userId: string,
    filename: string,
    rows: ParsedRow[],
    db: D1Database
): Promise<ImportResult> {
    const importId = createUUID();
    const errors: string[] = [];
    let rowsInserted = 0;

    // Get the user's max_end_time_seen from previous imports
    const lastImport = await db
        .prepare(
            "SELECT max_end_time_seen FROM imports WHERE user_id = ? ORDER BY uploaded_at DESC LIMIT 1"
        )
        .bind(userId)
        .first<{ max_end_time_seen: string | null }>();

    const maxEndTimeSeen = lastImport?.max_end_time_seen
        ? new Date(lastImport.max_end_time_seen)
        : null;

    // Filter rows based on max_end_time_seen (optimization)
    let candidateRows = rows;
    if (maxEndTimeSeen) {
        candidateRows = rows.filter((row) => row.endTime > maxEndTimeSeen);
    }

    // Track the new max_end_time_seen for this import
    let newMaxEndTime = maxEndTimeSeen;
    for (const row of rows) {
        if (!newMaxEndTime || row.endTime > newMaxEndTime) {
            newMaxEndTime = row.endTime;
        }
    }

    // Pre-cache existing data to avoid N+1 queries making thousands of subrequests
    const existingSetsResult = await db
        .prepare("SELECT source_row_hash FROM sets WHERE user_id = ?")
        .bind(userId)
        .all<{ source_row_hash: string }>();
    const existingHashes = new Set(
        existingSetsResult.results.map((r) => r.source_row_hash)
    );

    const existingExercisesResult = await db
        .prepare("SELECT id, exercise_key, display_name FROM exercises WHERE user_id = ?")
        .bind(userId)
        .all<{ id: string; exercise_key: string; display_name: string }>();

    type ExerciseInfo = { id: string; display_name: string };
    const exercisesMap = new Map<string, ExerciseInfo>();
    for (const ex of existingExercisesResult.results) {
        exercisesMap.set(ex.exercise_key, { id: ex.id, display_name: ex.display_name });
    }

    const statementsToBatch: any[] = [];
    // Process each candidate row and build statements
    for (let i = 0; i < candidateRows.length; i++) {
        const row = candidateRows[i];

        try {
            const sourceRowHash = await generateSourceRowHash(row);

            // Check memory cache
            if (existingHashes.has(sourceRowHash)) {
                // Skip duplicate
                continue;
            }
            existingHashes.add(sourceRowHash);

            const exerciseKey = normalizeExerciseKey(row.exerciseTitle);
            let exercise = exercisesMap.get(exerciseKey);

            if (!exercise) {
                const exerciseId = createUUID();
                statementsToBatch.push(
                    db.prepare(
                        "INSERT INTO exercises (id, user_id, exercise_key, display_name) VALUES (?, ?, ?, ?)"
                    ).bind(exerciseId, userId, exerciseKey, row.exerciseTitle)
                );
                exercise = { id: exerciseId, display_name: row.exerciseTitle };
                exercisesMap.set(exerciseKey, exercise);
            } else if (exercise.display_name !== row.exerciseTitle) {
                statementsToBatch.push(
                    db.prepare(
                        "UPDATE exercises SET display_name = ?, updated_at = datetime('now') WHERE id = ?"
                    ).bind(row.exerciseTitle, exercise.id)
                );
                exercise.display_name = row.exerciseTitle;
            }

            const setId = createUUID();
            statementsToBatch.push(
                db.prepare(
                    `INSERT INTO sets (
                        id, user_id, exercise_id, workout_title, start_time, end_time,
                        superset_id, set_index, set_type, description, weight_kg, reps,
                        rpe, distance_km, duration_seconds, exercise_notes, source_row_hash
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                ).bind(
                    setId,
                    userId,
                    exercise.id,
                    row.title,
                    row.startTime.toISOString(),
                    row.endTime.toISOString(),
                    row.supersetId,
                    row.setIndex,
                    row.setType,
                    row.description,
                    row.weightKg,
                    row.reps,
                    row.rpe,
                    row.distanceKm,
                    row.durationSeconds,
                    row.exerciseNotes,
                    sourceRowHash
                )
            );

            rowsInserted++;
        } catch (error) {
            errors.push(
                `Row ${i + 1}: ${error instanceof Error ? error.message : "Import failed to build"}`
            );
        }
    }

    // Execute generated statements using D1 batch in chunks of 50 to avoid limits
    if (statementsToBatch.length > 0) {
        const chunkSize = 50;
        for (let i = 0; i < statementsToBatch.length; i += chunkSize) {
            const chunk = statementsToBatch.slice(i, i + chunkSize);
            try {
                await db.batch(chunk);
            } catch (err) {
                console.error("Batch failure:", err);
                errors.push("Failed to execute database batch insertion");
            }
        }
    }

    // Record the import summary
    await db
        .prepare(
            `INSERT INTO imports (
        id, user_id, uploaded_at, source_filename, rows_seen, rows_inserted, max_end_time_seen
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
            importId,
            userId,
            new Date().toISOString(),
            filename,
            rows.length,
            rowsInserted,
            newMaxEndTime?.toISOString() ?? null
        )
        .run();

    return {
        importId,
        rowsSeen: rows.length,
        rowsInserted,
        maxEndTimeSeen: newMaxEndTime?.toISOString() ?? "",
        errors,
    };
}
