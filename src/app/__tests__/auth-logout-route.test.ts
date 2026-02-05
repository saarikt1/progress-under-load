import { describe, expect, it, vi } from "vitest";
import { getCloudflareContext } from "@opennextjs/cloudflare";

import { POST } from "@/app/api/auth/logout/route";

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: vi.fn(),
}));

type MockStatement = {
  bind: ReturnType<typeof vi.fn>;
  run: ReturnType<typeof vi.fn>;
};

const createStatement = (): MockStatement => {
  const statement: MockStatement = {
    bind: vi.fn(() => statement),
    run: vi.fn(),
  };

  return statement;
};

describe("POST /api/auth/logout", () => {
  it("clears the session cookie and deletes the session", async () => {
    const deleteStatement = createStatement();
    deleteStatement.run.mockResolvedValue({ success: true });

    const prepare = vi.fn((query: string) => {
      if (query === "DELETE FROM sessions WHERE token_hash = ?") {
        return deleteStatement;
      }
      throw new Error(`Unexpected query: ${query}`);
    });

    vi.mocked(getCloudflareContext).mockResolvedValue({
      env: {
        DB: { prepare },
      },
    } as unknown as Awaited<ReturnType<typeof getCloudflareContext>>);

    const response = await POST(
      new Request("https://app.test/api/auth/logout", {
        method: "POST",
        headers: {
          cookie: "session=token-value",
        },
      })
    );

    expect(deleteStatement.run).toHaveBeenCalled();

    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("session=");
    expect(setCookie).toContain("Max-Age=0");
  });
});
