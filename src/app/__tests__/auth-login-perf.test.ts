import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCloudflareContext } from "@opennextjs/cloudflare";

import { POST, __resetLoginRateLimiter } from "@/app/api/auth/login/route";
import { hashPassword } from "@/server/auth";

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: vi.fn(),
}));

type MockStatement = {
  bind: ReturnType<typeof vi.fn>;
  first: ReturnType<typeof vi.fn>;
  run: ReturnType<typeof vi.fn>;
};

const createStatement = (): MockStatement => {
  const statement: MockStatement = {
    bind: vi.fn(() => statement),
    first: vi.fn(),
    run: vi.fn(),
  };

  return statement;
};

describe("POST /api/auth/login - Performance", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    __resetLoginRateLimiter();
  });

  it("minimizes DB calls on successful login", async () => {
    const passwordHash = await hashPassword("correct-horse-battery-staple");

    const countStatement = createStatement();
    countStatement.first.mockResolvedValue({ count: 1 });

    const userStatement = createStatement();
    userStatement.first.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      password_hash: passwordHash,
      role: "user",
    });

    const sessionStatement = createStatement();
    sessionStatement.run.mockResolvedValue({ success: true });

    const prepare = vi.fn((query: string) => {
      switch (query) {
        case "SELECT COUNT(*) as count FROM users":
          return countStatement;
        case "SELECT id, email, password_hash, role FROM users WHERE email = ?":
          return userStatement;
        case "INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)":
          return sessionStatement;
        default:
          throw new Error(`Unexpected query: ${query}`);
      }
    });

    vi.mocked(getCloudflareContext).mockResolvedValue({
      env: {
        DB: { prepare },
        ADMIN_EMAIL: "admin@example.com",
        ADMIN_PASSWORD: "admin-password-123",
      },
    } as unknown as Awaited<ReturnType<typeof getCloudflareContext>>);

    const response = await POST(
      new Request("https://app.test/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "test@example.com",
          password: "correct-horse-battery-staple",
        }),
      })
    );

    expect(response.status).toBe(200);

    const bootstrapCall = prepare.mock.calls.find(call => call[0] === "SELECT COUNT(*) as count FROM users");
    const userLookupCall = prepare.mock.calls.find(call => call[0] === "SELECT id, email, password_hash, role FROM users WHERE email = ?");
    const sessionCreateCall = prepare.mock.calls.find(call => call[0] === "INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)");

    // Check that bootstrap was NOT called
    expect(bootstrapCall).toBeUndefined();

    // Check that necessary calls were made
    expect(userLookupCall).toBeDefined();
    expect(sessionCreateCall).toBeDefined();

    // Total prepare calls should be 2
    expect(prepare).toHaveBeenCalledTimes(2);
  });
});
