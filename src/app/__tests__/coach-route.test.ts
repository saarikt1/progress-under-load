import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/coach/route";
import {
  getAuthEnv,
  getCookieValue,
  getSessionByToken,
  getSessionCookieName,
} from "@/server/auth";
import { generateAndStoreCoachComment } from "@/server/coach";

vi.mock("@/server/auth", () => ({
  getAuthEnv: vi.fn(),
  getSessionByToken: vi.fn(),
  getCookieValue: vi.fn(),
  getSessionCookieName: vi.fn(() => "session"),
}));

vi.mock("@/server/coach", () => ({
  generateAndStoreCoachComment: vi.fn(),
}));

const makeRequest = (body: unknown, cookie?: string) =>
  new Request("https://app.test/api/coach", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  }) as any;

describe("POST /api/coach", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when no session cookie is present", async () => {
    vi.mocked(getCookieValue).mockReturnValue(null);
    vi.mocked(getAuthEnv).mockResolvedValue({ DB: {} } as any);

    const response = await POST(makeRequest({ import_id: "imp-1" }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns 401 when session is invalid", async () => {
    vi.mocked(getCookieValue).mockReturnValue("bad-token");
    vi.mocked(getSessionCookieName).mockReturnValue("session");
    vi.mocked(getSessionByToken).mockResolvedValue(null);
    vi.mocked(getAuthEnv).mockResolvedValue({ DB: { prepare: vi.fn() } } as any);

    const response = await POST(makeRequest({ import_id: "imp-1" }, "session=bad-token"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns 400 when import_id is missing", async () => {
    vi.mocked(getCookieValue).mockReturnValue("valid-token");
    vi.mocked(getSessionCookieName).mockReturnValue("session");
    vi.mocked(getSessionByToken).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com", role: "user" },
      expiresAt: "2026-03-01T00:00:00.000Z",
    });
    vi.mocked(getAuthEnv).mockResolvedValue({
      DB: { prepare: vi.fn() },
      LLM_API_KEY: "sk-test",
    } as any);

    const response = await POST(makeRequest({}, "session=valid-token"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "import_id is required" });
  });

  it("returns comment string on success", async () => {
    vi.mocked(getCookieValue).mockReturnValue("valid-token");
    vi.mocked(getSessionCookieName).mockReturnValue("session");
    vi.mocked(getSessionByToken).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com", role: "user" },
      expiresAt: "2026-03-01T00:00:00.000Z",
    });
    vi.mocked(getAuthEnv).mockResolvedValue({
      DB: { prepare: vi.fn() },
      LLM_API_KEY: "sk-test",
      LLM_BASE_URL: "https://api.example.com/v1",
      LLM_MODEL: "test-model",
    } as any);
    vi.mocked(generateAndStoreCoachComment).mockResolvedValue(
      "Great session! Your bench numbers are climbing."
    );

    const response = await POST(makeRequest({ import_id: "imp-1" }, "session=valid-token"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      comment: "Great session! Your bench numbers are climbing.",
    });
    expect(generateAndStoreCoachComment).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      "imp-1",
      expect.objectContaining({ LLM_API_KEY: "sk-test" })
    );
  });

  it("returns not_configured when LLM_API_KEY is absent", async () => {
    vi.mocked(getCookieValue).mockReturnValue("valid-token");
    vi.mocked(getSessionCookieName).mockReturnValue("session");
    vi.mocked(getSessionByToken).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com", role: "user" },
      expiresAt: "2026-03-01T00:00:00.000Z",
    });
    vi.mocked(getAuthEnv).mockResolvedValue({
      DB: { prepare: vi.fn() },
    } as any);

    const response = await POST(makeRequest({ import_id: "imp-1" }, "session=valid-token"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      comment: null,
      reason: "not_configured",
    });
    expect(generateAndStoreCoachComment).not.toHaveBeenCalled();
  });
});
