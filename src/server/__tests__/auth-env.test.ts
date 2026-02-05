import { afterEach, describe, expect, it, vi } from "vitest";
import { getCloudflareContext } from "@opennextjs/cloudflare";

import { getAuthEnv } from "@/server/auth";

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: vi.fn(),
}));

describe("getAuthEnv", () => {
  afterEach(() => {
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD;
    delete process.env.PBKDF2_ITERATIONS;
    delete process.env.SESSION_TTL_DAYS;
    vi.resetAllMocks();
  });

  it("falls back to process.env for auth settings", async () => {
    process.env.ADMIN_EMAIL = "fallback@example.com";
    process.env.ADMIN_PASSWORD = "fallback-password-123";
    process.env.PBKDF2_ITERATIONS = "123456";
    process.env.SESSION_TTL_DAYS = "45";

    vi.mocked(getCloudflareContext).mockResolvedValue({
      env: {
        DB: { prepare: vi.fn() },
      },
    } as unknown as Awaited<ReturnType<typeof getCloudflareContext>>);

    const env = await getAuthEnv();

    expect(env.ADMIN_EMAIL).toBe("fallback@example.com");
    expect(env.ADMIN_PASSWORD).toBe("fallback-password-123");
    expect(env.PBKDF2_ITERATIONS).toBe("123456");
    expect(env.SESSION_TTL_DAYS).toBe("45");
  });
});
