"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardFooter,
} from "@/components/ui/card";

interface ExerciseCardProps {
    id: string;
    displayName: string;
    totalSets: number;
    lastSession: string | null;
    latest1RM: number | null;
}

export function ExerciseCard({
    id,
    displayName,
    totalSets,
    lastSession,
    latest1RM,
}: ExerciseCardProps) {
    return (
        <Link href={`/exercises/${id}`}>
            <Card className="transition-colors hover:bg-accent">
                <CardHeader className="flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-base">{displayName}</CardTitle>
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
                        {totalSets} sets
                    </span>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    {latest1RM && (
                        <div>
                            <span className="text-muted-foreground">Est. 1RM:</span>{" "}
                            <span className="font-medium">{latest1RM.toFixed(1)} kg</span>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="justify-between text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    <span>Last session</span>
                    <span className="text-sm font-medium normal-case text-foreground">
                        {lastSession ? format(new Date(lastSession), "MMM d") : "--"}
                    </span>
                </CardFooter>
            </Card>
        </Link>
    );
}
