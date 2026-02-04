"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const benchPressData = [
  { date: "Jan 3", weight: 185 },
  { date: "Jan 6", weight: 190 },
  { date: "Jan 9", weight: 195 },
  { date: "Jan 12", weight: 200 },
  { date: "Jan 16", weight: 197 },
  { date: "Jan 20", weight: 205 },
  { date: "Jan 24", weight: 210 },
  { date: "Jan 29", weight: 215 },
];

export default function BenchPressPage() {
  return (
    <section className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Exercise detail
          </p>
          <h1 className="text-3xl font-semibold sm:text-4xl">Bench Press</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Placeholder trends while imports are offline. Replace this with live
            data in Phase 6.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Input placeholder="Filter sets" />
          <Button variant="secondary" type="button">
            View history
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Recent training volume</CardTitle>
          <CardDescription>Last 8 sessions (dummy data)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full" data-testid="exercise-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={benchPressData} margin={{ left: -8, right: 16 }}>
                <CartesianGrid
                  stroke="hsl(var(--border))"
                  strokeDasharray="4 4"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  cursor={{ stroke: "hsl(var(--border))", strokeDasharray: "3 3" }}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    borderRadius: "12px",
                    borderColor: "hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "hsl(var(--primary))" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Next focus</CardTitle>
            <CardDescription>Set up for your next push day.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Add a top set at RPE 8, then back off with two volume sets at 85%.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Technique note</CardTitle>
            <CardDescription>Reminder from your last log.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Pause one beat on the chest and keep elbows tucked under the bar.
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
