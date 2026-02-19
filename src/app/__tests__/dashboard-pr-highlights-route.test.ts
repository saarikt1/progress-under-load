import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/dashboard/pr-highlights/route";
import {
  getAuthEnv,
  getCookieValue,
  getSessionByToken,
  getSessionCookieName,
} from "@/server/auth";

vi.mock("@/server/auth", () => ({
  getAuthEnv: vi.fn(),
  getSessionByToken: vi.fn(),
  getCookieValue: vi.fn(),
  getSessionCookieName: vi.fn(() => "session"),
}));

type MockStatement = {
  bind: ReturnType<typeof vi.fn>;
  all: ReturnType<typeof vi.fn>;
};

const createStatement = (): MockStatement => {
  const statement: MockStatement = {
    bind: vi.fn(() => statement),
    all: vi.fn(),
  };

  return statement;
};

describe("GET /api/dashboard/pr-highlights", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-19T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 401 when no session cookie is present", async () => {
    vi.mocked(getCookieValue).mockReturnValue(null);

    const response = await GET(
      new Request("https://app.test/api/dashboard/pr-highlights") as any
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns recent PR events for main lifts and excludes non-main lifts", async () => {
    vi.mocked(getCookieValue).mockReturnValue("session-token");
    vi.mocked(getSessionCookieName).mockReturnValue("session");
    vi.mocked(getSessionByToken).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com", role: "user" },
      expiresAt: "2026-03-01T00:00:00.000Z",
    });

    const exercisesStatement = createStatement();
    exercisesStatement.all.mockResolvedValue({
      results: [
        {
          id: "ex-bench",
          display_name: "Bench Press (Barbell)",
          exercise_key: "bench press (barbell)",
        },
        {
          id: "ex-curl",
          display_name: "Biceps Curl",
          exercise_key: "biceps curl (dumbbell)",
        },
      ],
    });

    const setsStatement = createStatement();
    setsStatement.bind.mockImplementation((exerciseId: string) => {
      if (exerciseId === "ex-bench") {
        setsStatement.all.mockResolvedValueOnce({
          results: [
            {
              id: "set-1",
              end_time: "2026-02-18T10:00:00.000Z",
              start_time: "2026-02-18T09:55:00.000Z",
              workout_title: "Bench Day",
              weight_kg: 100,
              reps: 1,
              set_type: "normal",
              rpe: null,
            },
          ],
        });
      } else {
        setsStatement.all.mockResolvedValueOnce({
          results: [
            {
              id: "set-2",
              end_time: "2026-02-18T10:00:00.000Z",
              start_time: "2026-02-18T09:55:00.000Z",
              workout_title: "Curl Day",
              weight_kg: 30,
              reps: 10,
              set_type: "normal",
              rpe: null,
            },
          ],
        });
      }

      return setsStatement;
    });

    const prepare = vi.fn((query: string) => {
      if (query.includes("FROM exercises")) {
        return exercisesStatement;
      }
      if (query.includes("FROM sets")) {
        return setsStatement;
      }
      throw new Error(`Unexpected query: ${query}`);
    });

    vi.mocked(getAuthEnv).mockResolvedValue({
      DB: { prepare },
    } as any);

    const response = await GET(
      new Request("https://app.test/api/dashboard/pr-highlights") as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.window_days).toBe(7);
    expect(body.events).toHaveLength(2);
    expect(body.events.every((event: any) => event.exercise_id === "ex-bench")).toBe(
      true
    );
  });

  it("excludes PRs when the all-time best is older than seven days", async () => {
    vi.mocked(getCookieValue).mockReturnValue("session-token");
    vi.mocked(getSessionCookieName).mockReturnValue("session");
    vi.mocked(getSessionByToken).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com", role: "user" },
      expiresAt: "2026-03-01T00:00:00.000Z",
    });

    const exercisesStatement = createStatement();
    exercisesStatement.all.mockResolvedValue({
      results: [
        {
          id: "ex-deadlift",
          display_name: "Deadlift (Barbell)",
          exercise_key: "deadlift (barbell)",
        },
      ],
    });

    const setsStatement = createStatement();
    setsStatement.all.mockResolvedValue({
      results: [
        {
          id: "set-old-best",
          end_time: "2026-02-01T10:00:00.000Z",
          start_time: "2026-02-01T09:55:00.000Z",
          workout_title: "Deadlift Old PR",
          weight_kg: 180,
          reps: 1,
          set_type: "normal",
          rpe: null,
        },
        {
          id: "set-recent-not-best",
          end_time: "2026-02-18T10:00:00.000Z",
          start_time: "2026-02-18T09:55:00.000Z",
          workout_title: "Deadlift Recent",
          weight_kg: 160,
          reps: 1,
          set_type: "normal",
          rpe: null,
        },
      ],
    });

    const prepare = vi.fn((query: string) => {
      if (query.includes("FROM exercises")) {
        return exercisesStatement;
      }
      if (query.includes("FROM sets")) {
        return setsStatement;
      }
      throw new Error(`Unexpected query: ${query}`);
    });

    vi.mocked(getAuthEnv).mockResolvedValue({
      DB: { prepare },
    } as any);

    const response = await GET(
      new Request("https://app.test/api/dashboard/pr-highlights") as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.events).toEqual([]);
  });

  it("excludes non-normal sets and sorts events newest-first", async () => {
    vi.mocked(getCookieValue).mockReturnValue("session-token");
    vi.mocked(getSessionCookieName).mockReturnValue("session");
    vi.mocked(getSessionByToken).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com", role: "user" },
      expiresAt: "2026-03-01T00:00:00.000Z",
    });

    const exercisesStatement = createStatement();
    exercisesStatement.all.mockResolvedValue({
      results: [
        {
          id: "ex-squat",
          display_name: "Squat (Barbell)",
          exercise_key: "squat (barbell)",
        },
      ],
    });

    const setsStatement = createStatement();
    setsStatement.all.mockResolvedValue({
      results: [
        {
          id: "set-warmup",
          end_time: "2026-02-18T11:00:00.000Z",
          start_time: "2026-02-18T10:55:00.000Z",
          workout_title: "Squat Warmup",
          weight_kg: 220,
          reps: 1,
          set_type: "warmup",
          rpe: null,
        },
        {
          id: "set-pr",
          end_time: "2026-02-18T10:00:00.000Z",
          start_time: "2026-02-18T09:55:00.000Z",
          workout_title: "Squat PR",
          weight_kg: 200,
          reps: 1,
          set_type: "normal",
          rpe: null,
        },
        {
          id: "set-secondary",
          end_time: "2026-02-17T10:00:00.000Z",
          start_time: "2026-02-17T09:55:00.000Z",
          workout_title: "Squat Secondary",
          weight_kg: 190,
          reps: 2,
          set_type: "normal",
          rpe: null,
        },
      ],
    });

    const prepare = vi.fn((query: string) => {
      if (query.includes("FROM exercises")) {
        return exercisesStatement;
      }
      if (query.includes("FROM sets")) {
        return setsStatement;
      }
      throw new Error(`Unexpected query: ${query}`);
    });

    vi.mocked(getAuthEnv).mockResolvedValue({
      DB: { prepare },
    } as any);

    const response = await GET(
      new Request("https://app.test/api/dashboard/pr-highlights") as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.events).toHaveLength(2);
    expect(body.events[0].achieved_at >= body.events[1].achieved_at).toBe(true);
    expect(body.events[0].weight_kg).toBe(200);
  });
});
