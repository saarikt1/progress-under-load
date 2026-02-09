"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useExerciseDetail } from "@/hooks/use-exercise-detail";
import { processSetDataForChart, findMaxWeightPerWorkout } from "@/lib/one-rm";
import { OneRMChart } from "@/components/charts/one-rm-chart";
import { HeaviestWeightChart } from "@/components/charts/heaviest-weight-chart";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

type ChartView = "1rm" | "heaviest";

export default function ExerciseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const exerciseId = params.id as string;

    const [activeView, setActiveView] = useState<ChartView>("1rm");
    const { exercise, sets, isLoading, error } = useExerciseDetail(exerciseId);

    if (isLoading) {
        return (
            <section className="space-y-8">
                <p className="text-sm text-muted-foreground">Loading exercise data...</p>
            </section>
        );
    }

    if (error || !exercise) {
        return (
            <section className="space-y-8">
                <p className="text-sm text-destructive">
                    Error loading exercise: {error || "Exercise not found"}
                </p>
            </section>
        );
    }

    // Process data for charts
    const chartData = processSetDataForChart(sets);
    const maxWeightData = findMaxWeightPerWorkout(sets);

    return (
        <section className="space-y-8">
            <header className="space-y-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.back()}
                    className="gap-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Button>

                <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Exercise Analytics
                    </p>
                    <h1 className="text-3xl font-semibold sm:text-4xl">
                        {exercise.display_name}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {sets.length} sets logged
                    </p>
                </div>
            </header>

            {/* Chart tabs */}
            <div className="space-y-4">
                <div className="flex border-b">
                    <button
                        className={`px-4 py-2 text-sm font-medium transition-colors ${activeView === "1rm"
                                ? "border-b-2 border-primary text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                        onClick={() => setActiveView("1rm")}
                    >
                        One Rep Max
                    </button>
                    <button
                        className={`px-4 py-2 text-sm font-medium transition-colors ${activeView === "heaviest"
                                ? "border-b-2 border-primary text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                        onClick={() => setActiveView("heaviest")}
                    >
                        Heaviest Weight
                    </button>
                </div>

                {/* Chart content */}
                <div className="rounded-lg border p-4">
                    {activeView === "1rm" ? (
                        <OneRMChart data={chartData} showHeavySets={true} />
                    ) : (
                        <HeaviestWeightChart data={maxWeightData} />
                    )}
                </div>
            </div>
        </section>
    );
}
