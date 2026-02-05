import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

import { middleware } from "@/middleware";

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: vi.fn(),
}));

describe("middleware auth", () => {
  it("redirects to /login when unauthenticated", async () => {
    const request = new NextRequest("https://app.test/");

    const response = await middleware(request);

    expect(response?.headers.get("location")).toBe("https://app.test/login");
  });

  it("redirects non-admin users away from /admin", async () => {
    const sessionStatement = {
      bind: vi.fn(() => sessionStatement),
      first: vi.fn().mockResolvedValue({
        session_id: "session-1",
        user_id: "user-1",
        email: "user@example.com",
        role: "user",
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      }),
      run: vi.fn(),
    };

    const prepare = vi.fn((query: string) => {
      if (
        query ===
        "SELECT sessions.id as session_id, sessions.user_id, sessions.expires_at, users.email, users.role FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ?"
      ) {
        return sessionStatement;
      }
      throw new Error(`Unexpected query: ${query}`);
    });

    vi.mocked(getCloudflareContext).mockResolvedValue({
      env: {
        DB: { prepare },
      },
    } as unknown as Awaited<ReturnType<typeof getCloudflareContext>>);

    const request = new NextRequest("https://app.test/admin", {
      headers: { cookie: "session=token-value" },
    });

    const response = await middleware(request);

    expect(response?.headers.get("location")).toBe("https://app.test/");
  });

  it("allows the login route without auth", async () => {
    const request = new NextRequest("https://app.test/login");

    const response = await middleware(request);

    expect(response?.headers.get("x-middleware-next")).toBe("1");
  });
});
