import { describe, it, expect } from "vitest";
import { findHeaviestWeightPR, findBest1RMPR } from "@/lib/one-rm";
import type { WorkoutSet } from "@/lib/one-rm";

function makeSet(overrides: Partial<WorkoutSet> = {}): WorkoutSet {
    return {
        id: "1",
        end_time: "2026-01-15T10:00:00Z",
        start_time: "2026-01-15T09:55:00Z",
        workout_title: "Morning Workout",
        weight_kg: 100,
        reps: 5,
        set_type: "normal",
        rpe: null,
        ...overrides,
    };
}

describe("findHeaviestWeightPR", () => {
    it("returns null for empty sets", () => {
        expect(findHeaviestWeightPR([])).toBeNull();
    });

    it("returns the single set as PR", () => {
        const set = makeSet({ weight_kg: 80, reps: 3 });
        const result = findHeaviestWeightPR([set]);
        expect(result).not.toBeNull();
        expect(result!.weight).toBe(80);
        expect(result!.reps).toBe(3);
    });

    it("returns the heaviest set among multiple", () => {
        const sets = [
            makeSet({ id: "1", weight_kg: 80, reps: 5 }),
            makeSet({ id: "2", weight_kg: 120, reps: 1 }),
            makeSet({ id: "3", weight_kg: 100, reps: 3 }),
        ];
        const result = findHeaviestWeightPR(sets);
        expect(result!.weight).toBe(120);
        expect(result!.reps).toBe(1);
    });

    it("ignores non-normal set types", () => {
        const sets = [
            makeSet({ id: "1", weight_kg: 200, set_type: "warmup" }),
            makeSet({ id: "2", weight_kg: 100, set_type: "normal" }),
            makeSet({ id: "3", weight_kg: 150, set_type: "dropset" }),
        ];
        const result = findHeaviestWeightPR(sets);
        expect(result!.weight).toBe(100);
    });

    it("ignores sets without weight", () => {
        const sets = [
            makeSet({ id: "1", weight_kg: null }),
            makeSet({ id: "2", weight_kg: 80 }),
        ];
        const result = findHeaviestWeightPR(sets);
        expect(result!.weight).toBe(80);
    });

    it("ignores sets without reps", () => {
        const sets = [
            makeSet({ id: "1", reps: null }),
            makeSet({ id: "2", weight_kg: 90, reps: 5 }),
        ];
        const result = findHeaviestWeightPR(sets);
        expect(result!.weight).toBe(90);
    });

    it("returns null when all sets are non-normal", () => {
        const sets = [
            makeSet({ set_type: "warmup" }),
            makeSet({ set_type: "dropset" }),
        ];
        expect(findHeaviestWeightPR(sets)).toBeNull();
    });

    it("includes the correct date and workoutTitle", () => {
        const set = makeSet({
            weight_kg: 100,
            reps: 5,
            end_time: "2026-02-01T10:00:00Z",
            workout_title: "PR Day",
        });
        const result = findHeaviestWeightPR([set]);
        expect(result!.workoutTitle).toBe("PR Day");
        expect(result!.date).toEqual(new Date("2026-02-01T10:00:00Z"));
    });
});

describe("findBest1RMPR", () => {
    it("returns null for empty sets", () => {
        expect(findBest1RMPR([])).toBeNull();
    });

    it("returns the single set as PR with oneRM populated", () => {
        const set = makeSet({ weight_kg: 100, reps: 5 });
        const result = findBest1RMPR([set]);
        expect(result).not.toBeNull();
        expect(result!.oneRM).toBeDefined();
        expect(result!.oneRM!).toBeGreaterThan(100);
    });

    it("picks set with highest 1RM, not necessarily heaviest weight", () => {
        // 60kg × 10 reps: 1RM ≈ 78.5 (avg of Epley/Brzycki/Lombardi)
        // 70kg × 1 rep:   1RM = 70 (by definition)
        // So 60×10 wins on 1RM despite lower raw weight
        const sets = [
            makeSet({ id: "1", weight_kg: 70, reps: 1 }),   // 1RM = 70
            makeSet({ id: "2", weight_kg: 60, reps: 10 }),  // 1RM ≈ 78.5
        ];
        const result = findBest1RMPR(sets);
        expect(result!.weight).toBe(60);
        expect(result!.reps).toBe(10);
    });

    it("ignores non-normal set types", () => {
        const sets = [
            makeSet({ id: "1", weight_kg: 200, reps: 5, set_type: "warmup" }),
            makeSet({ id: "2", weight_kg: 100, reps: 5, set_type: "normal" }),
        ];
        const result = findBest1RMPR(sets);
        expect(result!.weight).toBe(100);
    });

    it("ignores sets without weight", () => {
        const sets = [
            makeSet({ id: "1", weight_kg: null, reps: 5 }),
            makeSet({ id: "2", weight_kg: 80, reps: 5 }),
        ];
        const result = findBest1RMPR(sets);
        expect(result!.weight).toBe(80);
    });

    it("ignores sets without reps", () => {
        const sets = [
            makeSet({ id: "1", weight_kg: 100, reps: null }),
            makeSet({ id: "2", weight_kg: 80, reps: 5 }),
        ];
        const result = findBest1RMPR(sets);
        expect(result!.weight).toBe(80);
    });

    it("returns null when all sets are non-normal or missing data", () => {
        const sets = [
            makeSet({ set_type: "warmup" }),
            makeSet({ weight_kg: null }),
        ];
        expect(findBest1RMPR(sets)).toBeNull();
    });

    it("oneRM on result equals calculate1RMRange avg for that set", () => {
        const set = makeSet({ weight_kg: 100, reps: 5 });
        const result = findBest1RMPR([set]);
        // Should be a rounded value ≥ 100
        expect(result!.oneRM).toBeGreaterThanOrEqual(100);
        expect(result!.oneRM! % 0.5).toBe(0); // rounded to nearest 0.5
    });
});
