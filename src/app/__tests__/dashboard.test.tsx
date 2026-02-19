import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

function mockDashboardFetch(prEvents: any[]) {
  return vi.spyOn(global, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();

    if (url === "/api/exercises") {
      return new Response(JSON.stringify({ exercises: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (url === "/api/dashboard/pr-highlights") {
      return new Response(
        JSON.stringify({
          window_days: 7,
          as_of: "2026-02-19T12:00:00.000Z",
          events: prEvents,
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      );
    }

    return new Response("Not found", { status: 404 });
  });
}

describe("Dashboard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a new PR section with an empty-state message when there are no recent PRs", async () => {
    mockDashboardFetch([]);

    render(<Home />);

    expect(
      screen.getByRole("heading", { name: "Dashboard" })
    ).toBeInTheDocument();

    expect(
      await screen.findByRole("heading", { name: "New PRs (Last 7 Days)" })
    ).toBeInTheDocument();
    expect(screen.getByText("No new PRs in the last 7 days.")).toBeInTheDocument();
  });

  it("shows PR highlight entries when recent PR events are returned", async () => {
    mockDashboardFetch([
      {
        exercise_id: "ex-bench",
        exercise_key: "bench press (barbell)",
        display_name: "Bench Press (Barbell)",
        pr_type: "heaviest_weight",
        weight_kg: 100,
        reps: 1,
        estimated_1rm_kg: null,
        achieved_at: "2026-02-18T10:00:00.000Z",
        workout_title: "Bench Day",
      },
    ]);

    render(<Home />);

    expect(
      await screen.findByRole("heading", { name: "New PRs (Last 7 Days)" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Bench Press (Barbell): 100kg x1 (Heaviest Weight)")
    ).toBeInTheDocument();
  });
});
