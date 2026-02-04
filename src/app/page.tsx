import { DEFAULT_LIFTS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <section className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Welcome back
          </p>
          <h1 className="text-3xl font-semibold sm:text-4xl">Dashboard</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Upload a CSV export to unlock trends, PRs, and coaching insights.
          </p>
        </div>
        <Button type="button">Upload CSV</Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {DEFAULT_LIFTS.map((lift) => (
          <Card key={lift}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{lift}</CardTitle>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
                Empty
              </span>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>No sessions yet. Import to see the last 7 days.</p>
            </CardContent>
            <CardFooter className="justify-between text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <span>Last session</span>
              <span className="text-sm font-medium normal-case text-foreground">--</span>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}
