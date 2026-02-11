"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { MAIN_LIFTS, TIME_PERIODS, type TimePeriod } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OneRMChart } from "@/components/charts/one-rm-chart";
import { processSetDataForChart, aggregateChartDataByWeek, type WorkoutSet } from "@/lib/one-rm";

interface ExerciseData {
  exerciseId: string | null;
  displayName: string;
  sets: WorkoutSet[];
  isLoading: boolean;
}

export default function Dashboard() {
  const [period, setPeriod] = useState<TimePeriod>("3M");
  const [exerciseData, setExerciseData] = useState<Record<string, ExerciseData>>({});

  useEffect(() => {
    const fetchMainLifts = async () => {
      // Fetch all exercises first to find IDs
      const exercisesResponse = await fetch("/api/exercises");
      if (!exercisesResponse.ok) return;

      const { exercises } = await exercisesResponse.json();

      // Map main lifts to exercise IDs
      const newExerciseData: Record<string, ExerciseData> = {};

      for (const [displayName, exerciseKey] of Object.entries(MAIN_LIFTS)) {
        const exercise = exercises.find(
          (e: any) => e.exercise_key === exerciseKey
        );

        if (exercise) {
          newExerciseData[displayName] = {
            exerciseId: exercise.id,
            displayName,
            sets: [],
            isLoading: true,
          };
        } else {
          newExerciseData[displayName] = {
            exerciseId: null,
            displayName,
            sets: [],
            isLoading: false,
          };
        }
      }

      setExerciseData(newExerciseData);

      // Fetch sets for each main lift
      for (const [displayName, data] of Object.entries(newExerciseData)) {
        if (data.exerciseId) {
          const detailResponse = await fetch(
            `/api/exercises/${data.exerciseId}?period=${period.toLowerCase()}`
          );

          if (detailResponse.ok) {
            const { sets } = await detailResponse.json();
            setExerciseData((prev) => ({
              ...prev,
              [displayName]: {
                ...prev[displayName],
                sets,
                isLoading: false,
              },
            }));
          }
        }
      }
    };

    fetchMainLifts();
  }, [period]);

  return (
    <section className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Welcome back
          </p>
          <h1 className="text-3xl font-semibold sm:text-4xl">Dashboard</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Track your progress on the main lifts and upload new data.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/exercises">All Exercises</Link>
          </Button>
          <Button asChild>
            <Link href="/upload">Upload CSV</Link>
          </Button>
        </div>
      </header>

      {/* Time period filter */}
      <div className="flex gap-2 border-b">
        {(Object.keys(TIME_PERIODS) as TimePeriod[]).map((p) => (
          <button
            key={p}
            className={`px-4 py-2 text-sm font-medium transition-colors ${period === p
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground"
              }`}
            onClick={() => setPeriod(p)}
          >
            {TIME_PERIODS[p].label}
          </button>
        ))}
      </div>

      {/* Main lifts grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {Object.entries(exerciseData).map(([displayName, data]) => {
          const rawChartData = data.sets.length > 0 ? processSetDataForChart(data.sets) : [];
          const chartData = aggregateChartDataByWeek(rawChartData);
          const hasData = chartData.length > 0;

          // Get latest 1RM if available
          const latest1RM = hasData ? chartData[chartData.length - 1].oneRM.avg : null;
          const lastSession = hasData
            ? data.sets[data.sets.length - 1].end_time
            : null;

          return (
            <Card key={displayName} className={data.exerciseId ? "cursor-pointer transition-colors hover:bg-accent" : ""}>
              <Link href={data.exerciseId ? `/exercises/${data.exerciseId}` : "#"} className={!data.exerciseId ? "pointer-events-none" : ""}>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-lg">{displayName}</CardTitle>
                  <span className={`rounded-full px-3 py-1 text-xs ${hasData
                    ? "bg-primary/10 text-primary"
                    : "bg-secondary text-muted-foreground"
                    }`}>
                    {hasData ? `${latest1RM?.toFixed(1)} kg` : "Empty"}
                  </span>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.isLoading ? (
                    <div className="flex h-64 items-center justify-center">
                      <p className="text-sm text-muted-foreground">Loading...</p>
                    </div>
                  ) : hasData ? (
                    <OneRMChart data={chartData} showHeavySets={true} />
                  ) : (
                    <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
                      <p className="text-sm text-muted-foreground">
                        No data yet. Upload CSV to see trends.
                      </p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="justify-between text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  <span>Last session</span>
                  <span className="text-sm font-medium normal-case text-foreground">
                    {lastSession ? format(new Date(lastSession), "MMM d") : "--"}
                  </span>
                </CardFooter>
              </Link>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
