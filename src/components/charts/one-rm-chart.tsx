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
    const allValues = data.flatMap((d) => [d.oneRM.avg]);
    if (data.some(d => d.isHeavySet)) {
        allValues.push(...data.filter(d => d.isHeavySet).map(d => d.weight));
    }

    // Add 2.5kg padding (typical small plate increment) or 5%
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const padding = Math.max(2.5, (maxValue - minValue) * 0.1);

    const yDomain = [
        Math.floor(minValue - padding),
        Math.ceil(maxValue + padding),
    ];

    return (
        <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis
                    dataKey="dateStr"
                    type="category"
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                    minTickGap={30}
                />
                <YAxis
                    domain={yDomain}
                    className="text-xs"
                    label={{ value: "Weight (kg)", angle: -90, position: "insideLeft" }}
                />
                <Tooltip
                    cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '3 3' }}
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
                <Legend wrapperStyle={{ paddingTop: "20px" }} />

                {/* Estimated 1RM trend line */}
                <Line
                    type="linear"
                    dataKey="avg"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Est. 1RM"
                    isAnimationActive={false}
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
