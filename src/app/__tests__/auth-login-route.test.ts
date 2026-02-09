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

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    __resetLoginRateLimiter();
  });

  it("returns user and sets a session cookie on valid credentials", async () => {
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
    await expect(response.json()).resolves.toEqual({
      user: { id: "user-1", email: "test@example.com", role: "user" },
    });

    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("session=");
    expect(sessionStatement.run).toHaveBeenCalled();
  });

  it("returns 401 for invalid credentials", async () => {
    const countStatement = createStatement();
    countStatement.first.mockResolvedValue({ count: 1 });

    const userStatement = createStatement();
    userStatement.first.mockResolvedValue(null);

    const sessionStatement = createStatement();

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
          email: "missing@example.com",
          password: "wrong-password",
        }),
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Invalid credentials" });
    expect(sessionStatement.run).not.toHaveBeenCalled();
  });

  it("bootstraps the admin user when users table is empty", async () => {
    const countStatement = createStatement();
    countStatement.first.mockResolvedValue({ count: 0 });

    let insertedPasswordHash: string | null = null;

    const insertStatement = createStatement();
    insertStatement.bind.mockImplementation((...args: unknown[]) => {
      insertedPasswordHash = args[2] as string;
      return insertStatement;
    });
    insertStatement.run.mockResolvedValue({ success: true });

    const userStatement = createStatement();
    userStatement.first.mockResolvedValueOnce(null).mockImplementation(async () => ({
      id: "admin-1",
      email: "admin@example.com",
      password_hash: insertedPasswordHash,
      role: "admin",
    }));

    const sessionStatement = createStatement();
    sessionStatement.run.mockResolvedValue({ success: true });

    const prepare = vi.fn((query: string) => {
      switch (query) {
        case "SELECT COUNT(*) as count FROM users":
          return countStatement;
        case "INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)":
          return insertStatement;
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
        ADMIN_PASSWORD: "correct-horse-battery-staple",
      },
    } as unknown as Awaited<ReturnType<typeof getCloudflareContext>>);

    const response = await POST(
      new Request("https://app.test/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "admin@example.com",
          password: "correct-horse-battery-staple",
        }),
      })
    );

    expect(insertStatement.run).toHaveBeenCalled();
    expect(insertStatement.bind).toHaveBeenCalledWith(
      expect.any(String),
      "admin@example.com",
      expect.stringMatching(/^pbkdf2\$sha256\$\d+/),
      "admin"
    );
    expect(response.status).toBe(200);
  });

  it("rate limits repeated attempts", async () => {
    const countStatement = createStatement();
    countStatement.first.mockResolvedValue({ count: 1 });

    const userStatement = createStatement();
    userStatement.first.mockResolvedValue(null);

    const sessionStatement = createStatement();

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

    const makeRequest = () =>
      new Request("https://app.test/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.42",
        },
        body: JSON.stringify({
          email: "missing@example.com",
          password: "wrong-password",
        }),
      });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await POST(makeRequest());
      expect(response.status).toBe(401);
    }

    const limitedResponse = await POST(makeRequest());
    expect(limitedResponse.status).toBe(429);
    await expect(limitedResponse.json()).resolves.toEqual({ error: "Too many attempts" });
  });
});
