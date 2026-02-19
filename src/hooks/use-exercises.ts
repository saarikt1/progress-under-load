"use client";

import { useState, useEffect } from "react";

interface Exercise {
    id: string;
    display_name: string;
    exercise_key: string;
    total_sets: number;
    last_session: string | null;
    latest_1rm: number | null;
    has_recent_pr: boolean;
}

interface UseExercisesResult {
    exercises: Exercise[];
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
}

export function useExercises(): UseExercisesResult {
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchExercises = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/exercises");

            if (!response.ok) {
                throw new Error("Failed to fetch exercises");
            }

            const data = await response.json();
            setExercises(data.exercises);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchExercises();
    }, []);

    return {
        exercises,
        isLoading,
        error,
        refetch: fetchExercises,
    };
}
