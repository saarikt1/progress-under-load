import { describe, it, expect } from "vitest";
import { parseCSV, normalizeExerciseKey } from "../csv-parser";

describe("CSV Parser", () => {
    describe("parseCSV", () => {
        it("should parse valid CSV with all required columns", () => {
            const csv = `title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe
Day A – Squat,8 Jan 2026 17:14,8 Jan 2026 18:18,,Squat (Barbell),,,0,normal,65,3,,0,
Day A – Squat,8 Jan 2026 17:14,8 Jan 2026 18:18,,Squat (Barbell),,,1,normal,65,3,,0,`;

            const result = parseCSV(csv);

            expect(result.errors).toEqual([]);
            expect(result.rows).toHaveLength(2);
            expect(result.rows[0]).toMatchObject({
                title: "Day A – Squat",
                exerciseTitle: "Squat (Barbell)",
                setIndex: 0,
                setType: "normal",
                weightKg: 65,
                reps: 3,
            });
            expect(result.rows[0].startTime).toBeInstanceOf(Date);
            expect(result.rows[0].endTime).toBeInstanceOf(Date);
        });

        it("should return error for missing required columns", () => {
            const csv = `title,start_time,end_time
Day A,8 Jan 2026 17:14,8 Jan 2026 18:18`;

            const result = parseCSV(csv);

            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain("Missing required columns");
        });

        it("should handle empty/null numeric fields", () => {
            const csv = `title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe
Test,8 Jan 2026 17:14,8 Jan 2026 18:18,,Test Exercise,,,0,normal,,,,,`;

            const result = parseCSV(csv);

            expect(result.errors).toEqual([]);
            expect(result.rows[0].weightKg).toBeNull();
            expect(result.rows[0].reps).toBeNull();
            expect(result.rows[0].distanceKm).toBeNull();
            expect(result.rows[0].durationSeconds).toBeNull();
            expect(result.rows[0].rpe).toBeNull();
        });

        it("should return error for invalid timestamps", () => {
            const csv = `title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe
Test,invalid date,8 Jan 2026 18:18,,Test,,,0,normal,65,3,,0,`;

            const result = parseCSV(csv);

            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain("Invalid start_time");
        });

        it("should return error for invalid numeric values", () => {
            const csv = `title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe
Test,8 Jan 2026 17:14,8 Jan 2026 18:18,,Test,,,0,normal,abc,3,,0,`;

            const result = parseCSV(csv);

            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain("weight_kg");
        });

        it("should handle exercise notes and description", () => {
            const csv = `title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe
Test,8 Jan 2026 17:14,8 Jan 2026 18:18,Workout notes,Test,,Exercise notes,0,normal,65,3,,0,`;

            const result = parseCSV(csv);

            expect(result.errors).toEqual([]);
            expect(result.rows[0].description).toBe("Workout notes");
            expect(result.rows[0].exerciseNotes).toBe("Exercise notes");
        });

        it("should require set_index", () => {
            const csv = `title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe
Test,8 Jan 2026 17:14,8 Jan 2026 18:18,,Test,,,, normal,65,3,,0,`;

            const result = parseCSV(csv);

            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain("set_index is required");
        });
    });

    describe("normalizeExerciseKey", () => {
        it("should convert to lowercase", () => {
            expect(normalizeExerciseKey("Squat (Barbell)")).toBe("squat (barbell)");
        });

        it("should trim whitespace", () => {
            expect(normalizeExerciseKey("  Squat (Barbell)  ")).toBe(
                "squat (barbell)"
            );
        });

        it("should collapse internal whitespace", () => {
            expect(normalizeExerciseKey("Squat    (Barbell)")).toBe(
                "squat (barbell)"
            );
        });

        it("should handle multiple transformations", () => {
            expect(normalizeExerciseKey("  SQUAT   (BARBELL)  ")).toBe(
                "squat (barbell)"
            );
        });
    });
});
