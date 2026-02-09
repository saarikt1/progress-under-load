import type { ParsedRow } from "./csv-parser";
import { normalizeExerciseKey } from "./csv-parser";

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

    // Process each candidate row
    for (let i = 0; i < candidateRows.length; i++) {
        const row = candidateRows[i];
        const sourceRowHash = await generateSourceRowHash(row);

        try {
            // Check if this row already exists for this user
            const existing = await db
                .prepare(
                    "SELECT id FROM sets WHERE user_id = ? AND source_row_hash = ?"
                )
                .bind(userId, sourceRowHash)
                .first<{ id: string }>();

            if (existing) {
                // Skip duplicate
                continue;
            }

            // Normalize exercise key
            const exerciseKey = normalizeExerciseKey(row.exerciseTitle);

            // Upsert exercise (create if doesn't exist, update display_name if exists)
            let exercise = await db
                .prepare(
                    "SELECT id, display_name FROM exercises WHERE user_id = ? AND exercise_key = ?"
                )
                .bind(userId, exerciseKey)
                .first<{ id: string; display_name: string }>();

            if (!exercise) {
                // Insert new exercise
                const exerciseId = createUUID();
                await db
                    .prepare(
                        "INSERT INTO exercises (id, user_id, exercise_key, display_name) VALUES (?, ?, ?, ?)"
                    )
                    .bind(exerciseId, userId, exerciseKey, row.exerciseTitle)
                    .run();
                exercise = { id: exerciseId, display_name: row.exerciseTitle };
            } else {
                // Update display_name to the latest seen (optional: could skip this)
                await db
                    .prepare(
                        "UPDATE exercises SET display_name = ?, updated_at = datetime('now') WHERE id = ?"
                    )
                    .bind(row.exerciseTitle, exercise.id)
                    .run();
            }

            // Insert the set
            const setId = createUUID();
            await db
                .prepare(
                    `INSERT INTO sets (
            id, user_id, exercise_id, workout_title, start_time, end_time,
            superset_id, set_index, set_type, description, weight_kg, reps,
            rpe, distance_km, duration_seconds, exercise_notes, source_row_hash
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                )
                .bind(
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
                .run();

            rowsInserted++;
        } catch (error) {
            errors.push(
                `Row ${i + 1}: ${error instanceof Error ? error.message : "Import failed"}`
            );
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
