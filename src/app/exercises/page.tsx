"use client";

import { useState, useMemo } from "react";
import { useExercises } from "@/hooks/use-exercises";
import { ExerciseCard } from "@/components/exercise-card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function ExercisesPage() {
    const { exercises, isLoading, error } = useExercises();
    const [searchQuery, setSearchQuery] = useState("");

    // Filter exercises by search query
    const filteredExercises = useMemo(() => {
        if (!searchQuery.trim()) return exercises;

        const query = searchQuery.toLowerCase();
        return exercises.filter((exercise) =>
            exercise.display_name.toLowerCase().includes(query)
        );
    }, [exercises, searchQuery]);

    if (isLoading) {
        return (
            <section className="space-y-8">
                <header>
                    <h1 className="text-3xl font-semibold sm:text-4xl">Exercises</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Loading your exercises...
                    </p>
                </header>
            </section>
        );
    }

    if (error) {
        return (
            <section className="space-y-8">
                <header>
                    <h1 className="text-3xl font-semibold sm:text-4xl">Exercises</h1>
                    <p className="mt-2 text-sm text-destructive">
                        Error loading exercises: {error}
                    </p>
                </header>
            </section>
        );
    }

    return (
        <section className="space-y-8">
            <header className="space-y-4">
                <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Your exercises
                    </p>
                    <h1 className="text-3xl font-semibold sm:text-4xl">Exercises</h1>
                    <p className="max-w-xl text-sm text-muted-foreground">
                        Browse and search all your exercises. Click on an exercise to view detailed analytics.
                    </p>
                </div>

                {/* Search */}
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search exercises..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </header>

            {/* Exercise grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredExercises.length === 0 ? (
                    <div className="col-span-full flex h-64 items-center justify-center rounded-lg border border-dashed">
                        <p className="text-sm text-muted-foreground">
                            {searchQuery ? "No exercises match your search" : "No exercises found"}
                        </p>
                    </div>
                ) : (
                    filteredExercises.map((exercise) => (
                        <ExerciseCard
                            key={exercise.id}
                            id={exercise.id}
                            displayName={exercise.display_name}
                            totalSets={exercise.total_sets}
                            lastSession={exercise.last_session}
                            latest1RM={exercise.latest_1rm}
                        />
                    ))
                )}
            </div>
        </section>
    );
}
