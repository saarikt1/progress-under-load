"use client";

import { format } from "date-fns";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import type { MaxWeightPoint } from "@/lib/one-rm";

interface HeaviestWeightChartProps {
    data: MaxWeightPoint[];
}

export function HeaviestWeightChart({ data }: HeaviestWeightChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground">No data available</p>
            </div>
        );
    }

    // Prepare chart data
    const chartData = data.map((point) => ({
        date: point.date.getTime(),
        dateStr: format(point.date, "MMM d, yyyy"),
        weight: point.weight,
        workoutTitle: point.workoutTitle,
    }));

    // Calculate Y-axis domain with padding
    const weights = data.map((d) => d.weight);
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);
    const padding = (maxWeight - minWeight) * 0.1;
    const yDomain = [
        Math.floor(minWeight - padding),
        Math.ceil(maxWeight + padding),
    ];

    return (
        <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                    dataKey="date"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    tickFormatter={(timestamp) => format(new Date(timestamp), "MMM d")}
                    className="text-xs"
                />
                <YAxis domain={yDomain} className="text-xs" label={{ value: "Weight (kg)", angle: -90, position: "insideLeft" }} />
                <Tooltip
                    content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const data = payload[0].payload;
                        return (
                            <div className="rounded-lg border bg-background p-2 shadow-md">
                                <p className="text-xs font-medium">{data.dateStr}</p>
                                <p className="text-xs text-muted-foreground">{data.workoutTitle}</p>
                                <p className="mt-1 text-xs">
                                    <span className="font-medium">Max weight:</span> {data.weight.toFixed(1)} kg
                                </p>
                            </div>
                        );
                    }}
                />
                <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", r: 4 }}
                    activeDot={{ r: 6 }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
