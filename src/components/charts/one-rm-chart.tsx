"use client";

import { format } from "date-fns";
import {
    LineChart,
    Line,
    Area,
    AreaChart,
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    ComposedChart,
} from "recharts";
import type { ChartDataPoint } from "@/lib/one-rm";

interface OneRMChartProps {
    data: ChartDataPoint[];
    showHeavySets?: boolean;
}

export function OneRMChart({ data, showHeavySets = true }: OneRMChartProps) {
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
        min: point.oneRM.min,
        max: point.oneRM.max,
        avg: point.oneRM.avg,
        weight: point.isHeavySet ? point.weight : null,
        reps: point.reps,
        workoutTitle: point.workoutTitle,
    }));

    // Calculate Y-axis domain with padding
    const allValues = data.flatMap((d) => [d.oneRM.min, d.oneRM.max]);
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const padding = (maxValue - minValue) * 0.1;
    const yDomain = [
        Math.floor(minValue - padding),
        Math.ceil(maxValue + padding),
    ];

    return (
        <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                                <div className="mt-1 space-y-0.5">
                                    <p className="text-xs">
                                        <span className="font-medium">Est. 1RM:</span> {data.avg.toFixed(1)} kg
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Range: {data.min.toFixed(1)} - {data.max.toFixed(1)} kg
                                    </p>
                                    {data.weight && (
                                        <p className="text-xs font-medium text-primary">
                                            Heavy set: {data.weight} kg × {data.reps}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    }}
                />
                <Legend />

                {/* Range band (min-max) */}
                <Area
                    type="monotone"
                    dataKey="max"
                    stroke="none"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.1}
                    name="1RM Range"
                />
                <Area
                    type="monotone"
                    dataKey="min"
                    stroke="none"
                    fill="hsl(var(--background))"
                    fillOpacity={1}
                />

                {/* Estimated 1RM trend line */}
                <Line
                    type="monotone"
                    dataKey="avg"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    name="Est. 1RM"
                />

                {/* Heavy sets (reps <= 3) */}
                {showHeavySets && (
                    <Scatter
                        dataKey="weight"
                        fill="hsl(var(--destructive))"
                        name="Heavy Sets (≤3 reps)"
                    />
                )}
            </ComposedChart>
        </ResponsiveContainer>
    );
}
