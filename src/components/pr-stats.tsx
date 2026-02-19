import { format } from "date-fns";
import { Trophy, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface PRRecord {
    weight: number;
    reps: number;
    date: string; // ISO string from API
    workoutTitle: string;
    oneRM?: number;
}

interface PrStatsProps {
    heaviest: PRRecord | null;
    estimated1rm: PRRecord | null;
}

export function PrStats({ heaviest, estimated1rm }: PrStatsProps) {
    if (!heaviest && !estimated1rm) return null;

    return (
        <div className="grid grid-cols-2 gap-4">
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        <Trophy className="h-3.5 w-3.5" />
                        All-Time Heaviest
                    </div>
                    {heaviest ? (
                        <div className="mt-2 space-y-0.5">
                            <p className="text-2xl font-semibold">
                                {heaviest.weight} kg{" "}
                                <span className="text-base font-normal text-muted-foreground">
                                    × {heaviest.reps}
                                </span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {format(new Date(heaviest.date), "MMM d, yyyy")}
                            </p>
                        </div>
                    ) : (
                        <p className="mt-2 text-sm text-muted-foreground">No data</p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Est. 1RM PR
                    </div>
                    {estimated1rm ? (
                        <div className="mt-2 space-y-0.5">
                            <p className="text-2xl font-semibold">
                                {estimated1rm.oneRM?.toFixed(1)} kg
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {format(new Date(estimated1rm.date), "MMM d, yyyy")}
                            </p>
                        </div>
                    ) : (
                        <p className="mt-2 text-sm text-muted-foreground">No data</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
