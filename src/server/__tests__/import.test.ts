import { describe, it, expect, beforeEach } from "vitest";
import { generateSourceRowHash, importCSV } from "../import";
import type { ParsedRow } from "../csv-parser";

// Mock D1 Database for testing
class MockD1Database {
    private data: Map<string, any[]> = new Map();

    constructor() {
        this.data.set("imports", []);
        this.data.set("exercises", []);
        this.data.set("sets", []);
    }

    prepare(sql: string) {
        const self = this;
        return {
            bind(...params: any[]) {
                return {
                    async first() {
                        // Mock queries
                        if (sql.includes("SELECT max_end_time_seen FROM imports")) {
                            const imports = self.data.get("imports") || [];
                            const userImports = imports.filter(
                                (i: any) => i.user_id === params[0]
                            );
                            if (userImports.length === 0) return null;
                            return {
                                max_end_time_seen:
                                    userImports[userImports.length - 1].max_end_time_seen,
                            };
                        }
                        if (sql.includes("SELECT id FROM sets")) {
                            const sets = self.data.get("sets") || [];
                            const found = sets.find(
                                (s: any) =>
                                    s.user_id === params[0] && s.source_row_hash === params[1]
                            );
                            return found || null;
                        }
                        if (sql.includes("SELECT id, display_name FROM exercises")) {
                            const exercises = self.data.get("exercises") || [];
                            const found = exercises.find(
                                (e: any) =>
                                    e.user_id === params[0] && e.exercise_key === params[1]
                            );
                            return found || null;
                        }
                        return null;
                    },
                    async run() {
                        // Mock inserts/updates
                        if (sql.includes("INSERT INTO exercises")) {
                            const exercises = self.data.get("exercises") || [];
                            exercises.push({
                                id: params[0],
                                user_id: params[1],
                                exercise_key: params[2],
                                display_name: params[3],
                            });
                            self.data.set("exercises", exercises);
                        }
                        if (sql.includes("INSERT INTO sets")) {
                            const sets = self.data.get("sets") || [];
                            sets.push({
                                id: params[0],
                                user_id: params[1],
                                exercise_id: params[2],
                                source_row_hash: params[16],
                            });
                            self.data.set("sets", sets);
                        }
                        if (sql.includes("INSERT INTO imports")) {
                            const imports = self.data.get("imports") || [];
                            imports.push({
                                id: params[0],
                                user_id: params[1],
                                uploaded_at: params[2],
                                source_filename: params[3],
                                rows_seen: params[4],
                                rows_inserted: params[5],
                                max_end_time_seen: params[6],
                            });
                            self.data.set("imports", imports);
                        }
                        if (sql.includes("UPDATE exercises")) {
                            const exercises = self.data.get("exercises") || [];
                            const exercise = exercises.find((e: any) => e.id === params[1]);
                            if (exercise) {
                                exercise.display_name = params[0];
                            }
                        }
                        return {};
                    },
                };
            },
        };
    }

    getData(table: string) {
        return this.data.get(table) || [];
    }
}

describe("Import Service", () => {
    let mockDb: MockD1Database;

    beforeEach(() => {
        mockDb = new MockD1Database();
    });

    describe("generateSourceRowHash", () => {
        it("should generate consistent hash for same row", async () => {
            const row: ParsedRow = {
                title: "Day A",
                startTime: new Date("2026-01-08T17:14:00Z"),
                endTime: new Date("2026-01-08T18:18:00Z"),
                description: null,
                exerciseTitle: "Squat (Barbell)",
                supersetId: null,
                exerciseNotes: null,
                setIndex: 0,
                setType: "normal",
                weightKg: 65,
                reps: 3,
                distanceKm: null,
                durationSeconds: null,
                rpe: null,
            };

            const hash1 = await generateSourceRowHash(row);
            const hash2 = await generateSourceRowHash(row);

            expect(hash1).toBe(hash2);
            expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex characters
        });

        it("should generate different hash for different rows", async () => {
            const row1: ParsedRow = {
                title: "Day A",
                startTime: new Date("2026-01-08T17:14:00Z"),
                endTime: new Date("2026-01-08T18:18:00Z"),
                description: null,
                exerciseTitle: "Squat (Barbell)",
                supersetId: null,
                exerciseNotes: null,
                setIndex: 0,
                setType: "normal",
                weightKg: 65,
                reps: 3,
                distanceKm: null,
                durationSeconds: null,
                rpe: null,
            };

            const row2: ParsedRow = {
                ...row1,
                setIndex: 1, // Different set index
            };

            const hash1 = await generateSourceRowHash(row1);
            const hash2 = await generateSourceRowHash(row2);

            expect(hash1).not.toBe(hash2);
        });
    });

    describe("importCSV", () => {
        it("should import all rows on first import", async () => {
            const rows: ParsedRow[] = [
                {
                    title: "Day A",
                    startTime: new Date("2026-01-08T17:14:00Z"),
                    endTime: new Date("2026-01-08T18:18:00Z"),
                    description: null,
                    exerciseTitle: "Squat (Barbell)",
                    supersetId: null,
                    exerciseNotes: null,
                    setIndex: 0,
                    setType: "normal",
                    weightKg: 65,
                    reps: 3,
                    distanceKm: null,
                    durationSeconds: null,
                    rpe: null,
                },
                {
                    title: "Day A",
                    startTime: new Date("2026-01-08T17:14:00Z"),
                    endTime: new Date("2026-01-08T18:18:00Z"),
                    description: null,
                    exerciseTitle: "Squat (Barbell)",
                    supersetId: null,
                    exerciseNotes: null,
                    setIndex: 1,
                    setType: "normal",
                    weightKg: 65,
                    reps: 3,
                    distanceKm: null,
                    durationSeconds: null,
                    rpe: null,
                },
            ];

            const result = await importCSV(
                "user-1",
                "test.csv",
                rows,
                mockDb as unknown as D1Database
            );

            expect(result.rowsSeen).toBe(2);
            expect(result.rowsInserted).toBe(2);
            expect(result.errors).toEqual([]);

            const sets = mockDb.getData("sets");
            expect(sets).toHaveLength(2);
        });

        it("should skip duplicate rows on re-import", async () => {
            const rows: ParsedRow[] = [
                {
                    title: "Day A",
                    startTime: new Date("2026-01-08T17:14:00Z"),
                    endTime: new Date("2026-01-08T18:18:00Z"),
                    description: null,
                    exerciseTitle: "Squat (Barbell)",
                    supersetId: null,
                    exerciseNotes: null,
                    setIndex: 0,
                    setType: "normal",
                    weightKg: 65,
                    reps: 3,
                    distanceKm: null,
                    durationSeconds: null,
                    rpe: null,
                },
            ];

            // First import
            await importCSV(
                "user-1",
                "test.csv",
                rows,
                mockDb as unknown as D1Database
            );

            // Second import (same data)
            const result = await importCSV(
                "user-1",
                "test.csv",
                rows,
                mockDb as unknown as D1Database
            );

            expect(result.rowsSeen).toBe(1);
            expect(result.rowsInserted).toBe(0); // Should skip duplicate

            const sets = mockDb.getData("sets");
            expect(sets).toHaveLength(1); // Still only one set
        });

        it("should isolate data between different users", async () => {
            const rows: ParsedRow[] = [
                {
                    title: "Day A",
                    startTime: new Date("2026-01-08T17:14:00Z"),
                    endTime: new Date("2026-01-08T18:18:00Z"),
                    description: null,
                    exerciseTitle: "Squat (Barbell)",
                    supersetId: null,
                    exerciseNotes: null,
                    setIndex: 0,
                    setType: "normal",
                    weightKg: 65,
                    reps: 3,
                    distanceKm: null,
                    durationSeconds: null,
                    rpe: null,
                },
            ];

            // Import for user 1
            const result1 = await importCSV(
                "user-1",
                "test.csv",
                rows,
                mockDb as unknown as D1Database
            );

            // Import same data for user 2
            const result2 = await importCSV(
                "user-2",
                "test.csv",
                rows,
                mockDb as unknown as D1Database
            );

            expect(result1.rowsInserted).toBe(1);
            expect(result2.rowsInserted).toBe(1); // Should insert for user 2

            const sets = mockDb.getData("sets");
            expect(sets).toHaveLength(2); // One for each user
            expect(sets[0].user_id).toBe("user-1");
            expect(sets[1].user_id).toBe("user-2");
        });

        it("should create exercise if it doesn't exist", async () => {
            const rows: ParsedRow[] = [
                {
                    title: "Day A",
                    startTime: new Date("2026-01-08T17:14:00Z"),
                    endTime: new Date("2026-01-08T18:18:00Z"),
                    description: null,
                    exerciseTitle: "Squat (Barbell)",
                    supersetId: null,
                    exerciseNotes: null,
                    setIndex: 0,
                    setType: "normal",
                    weightKg: 65,
                    reps: 3,
                    distanceKm: null,
                    durationSeconds: null,
                    rpe: null,
                },
            ];

            await importCSV(
                "user-1",
                "test.csv",
                rows,
                mockDb as unknown as D1Database
            );

            const exercises = mockDb.getData("exercises");
            expect(exercises).toHaveLength(1);
            expect(exercises[0]).toMatchObject({
                user_id: "user-1",
                exercise_key: "squat (barbell)",
                display_name: "Squat (Barbell)",
            });
        });

        it("should track max_end_time_seen", async () => {
            const rows: ParsedRow[] = [
                {
                    title: "Day A",
                    startTime: new Date("2026-01-08T17:14:00Z"),
                    endTime: new Date("2026-01-08T18:18:00Z"),
                    description: null,
                    exerciseTitle: "Squat (Barbell)",
                    supersetId: null,
                    exerciseNotes: null,
                    setIndex: 0,
                    setType: "normal",
                    weightKg: 65,
                    reps: 3,
                    distanceKm: null,
                    durationSeconds: null,
                    rpe: null,
                },
                {
                    title: "Day B",
                    startTime: new Date("2026-01-09T17:14:00Z"),
                    endTime: new Date("2026-01-09T18:18:00Z"),
                    description: null,
                    exerciseTitle: "Bench Press",
                    supersetId: null,
                    exerciseNotes: null,
                    setIndex: 0,
                    setType: "normal",
                    weightKg: 40,
                    reps: 5,
                    distanceKm: null,
                    durationSeconds: null,
                    rpe: null,
                },
            ];

            const result = await importCSV(
                "user-1",
                "test.csv",
                rows,
                mockDb as unknown as D1Database
            );

            expect(result.maxEndTimeSeen).toBe("2026-01-09T18:18:00.000Z");
        });
    });
});
