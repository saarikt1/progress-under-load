"use client";

import { useState, useEffect } from "react";
import type { WorkoutSet } from "@/lib/one-rm";

interface Exercise {
    id: string;
    display_name: string;
    exercise_key: string;
}

interface PRRecordJSON {
    weight: number;
    reps: number;
    date: string;
    workoutTitle: string;
    oneRM?: number;
}

interface PRs {
    heaviest: PRRecordJSON | null;
    estimated_1rm: PRRecordJSON | null;
}

interface UseExerciseDetailResult {
    exercise: Exercise | null;
    sets: WorkoutSet[];
    prs: PRs | null;
    isLoading: boolean;
    error: string | null;
}

export function useExerciseDetail(
    exerciseId: string,
    period: string = "3m"
): UseExerciseDetailResult {
    const [exercise, setExercise] = useState<Exercise | null>(null);
    const [sets, setSets] = useState<WorkoutSet[]>([]);
    const [prs, setPrs] = useState<PRs | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchExerciseDetail = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(
                    `/api/exercises/${exerciseId}?period=${period}`
                );

                if (!response.ok) {
                    throw new Error("Failed to fetch exercise detail");
                }

                const data = await response.json();
                setExercise(data.exercise);
                setSets(data.sets);
                setPrs(data.prs ?? null);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unknown error");
            } finally {
                setIsLoading(false);
            }
        };

        if (exerciseId) {
            fetchExerciseDetail();
        }
    }, [exerciseId, period]);

    return {
        exercise,
        sets,
        prs,
        isLoading,
        error,
    };
}
