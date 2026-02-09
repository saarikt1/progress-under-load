import Papa from "papaparse";

/**
 * Required CSV column headers for workout data
 */
const REQUIRED_HEADERS = [
    "title",
    "start_time",
    "end_time",
    "description",
    "exercise_title",
    "superset_id",
    "exercise_notes",
    "set_index",
    "set_type",
    "weight_kg",
    "reps",
    "distance_km",
    "duration_seconds",
    "rpe",
] as const;

/**
 * Parsed row structure from CSV
 */
export interface ParsedRow {
    title: string;
    startTime: Date;
    endTime: Date;
    description: string | null;
    exerciseTitle: string;
    supersetId: string | null;
    exerciseNotes: string | null;
    setIndex: number;
    setType: string;
    weightKg: number | null;
    reps: number | null;
    distanceKm: number | null;
    durationSeconds: number | null;
    rpe: number | null;
}

/**
 * Result of CSV parsing
 */
export interface ParseResult {
    rows: ParsedRow[];
    errors: string[];
}

/**
 * Parse a CSV string into structured workout data
 */
export function parseCSV(csvContent: string): ParseResult {
    const errors: string[] = [];
    const rows: ParsedRow[] = [];

    // Parse CSV with papaparse
    const parseResult = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim(),
    });

    // Check for parsing errors
    if (parseResult.errors.length > 0) {
        parseResult.errors.forEach((error) => {
            errors.push(`Row ${error.row}: ${error.message}`);
        });
    }

    // Validate headers
    const headers = parseResult.meta.fields || [];
    try {
        validateCSVHeaders(headers);
    } catch (error) {
        errors.push(
            error instanceof Error ? error.message : "Header validation failed"
        );
        return { rows: [], errors };
    }

    // Parse each row
    parseResult.data.forEach((row: any, index: number) => {
        try {
            const parsedRow = parseRow(row, index + 2); // +2 because row 1 is header, 0-indexed
            rows.push(parsedRow);
        } catch (error) {
            errors.push(
                `Row ${index + 2}: ${error instanceof Error ? error.message : "Parse error"}`
            );
        }
    });

    return { rows, errors };
}

/**
 * Validate that all required columns are present
 */
function validateCSVHeaders(headers: string[]): void {
    const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
    if (missing.length > 0) {
        throw new Error(
            `Missing required columns: ${missing.join(", ")}. Found columns: ${headers.join(", ")}`
        );
    }
}

/**
 * Parse a single CSV row into typed data
 */
function parseRow(row: any, rowNumber: number): ParsedRow {
    // Parse timestamps
    const startTime = parseTimestamp(row.start_time, "start_time", rowNumber);
    const endTime = parseTimestamp(row.end_time, "end_time", rowNumber);

    // Parse set_index (required)
    const setIndex = parseInteger(row.set_index, "set_index", rowNumber, true);
    if (setIndex === null) {
        throw new Error(`set_index is required`);
    }

    return {
        title: row.title?.trim() || "",
        startTime,
        endTime,
        description: parseNullableString(row.description),
        exerciseTitle: row.exercise_title?.trim() || "",
        supersetId: parseNullableString(row.superset_id),
        exerciseNotes: parseNullableString(row.exercise_notes),
        setIndex,
        setType: row.set_type?.trim() || "normal",
        weightKg: parseFloat(row.weight_kg, "weight_kg", rowNumber),
        reps: parseInteger(row.reps, "reps", rowNumber, false),
        distanceKm: parseFloat(row.distance_km, "distance_km", rowNumber),
        durationSeconds: parseInteger(
            row.duration_seconds,
            "duration_seconds",
            rowNumber,
            false
        ),
        rpe: parseFloat(row.rpe, "rpe", rowNumber),
    };
}

/**
 * Parse timestamp in format "18 Jan 2026, 17:42"
 */
function parseTimestamp(
    value: string,
    fieldName: string,
    rowNumber: number
): Date {
    if (!value || value.trim() === "") {
        throw new Error(`${fieldName} is required`);
    }

    const date = new Date(value.trim());
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid ${fieldName}: "${value}"`);
    }

    return date;
}

/**
 * Parse a float value, returns null if empty/invalid
 */
function parseFloat(
    value: string,
    fieldName: string,
    rowNumber: number
): number | null {
    if (!value || value.trim() === "") {
        return null;
    }

    const num = Number(value);
    if (isNaN(num)) {
        throw new Error(`Invalid ${fieldName}: "${value}" is not a number`);
    }

    return num;
}

/**
 * Parse an integer value, returns null if empty/invalid
 */
function parseInteger(
    value: string,
    fieldName: string,
    rowNumber: number,
    required: boolean
): number | null {
    if (!value || value.trim() === "") {
        if (required) {
            throw new Error(`${fieldName} is required`);
        }
        return null;
    }

    const num = parseInt(value, 10);
    if (isNaN(num)) {
        throw new Error(`Invalid ${fieldName}: "${value}" is not an integer`);
    }

    return num;
}

/**
 * Parse a nullable string (convert empty to null)
 */
function parseNullableString(value: string): string | null {
    if (!value || value.trim() === "") {
        return null;
    }
    return value.trim();
}

/**
 * Normalize exercise title to a consistent key
 * Lowercase, trim, and collapse internal whitespace
 */
export function normalizeExerciseKey(exerciseTitle: string): string {
    return exerciseTitle
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");
}
