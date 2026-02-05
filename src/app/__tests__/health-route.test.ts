import { describe, expect, it, vi } from "vitest";
import { getCloudflareContext } from "@opennextjs/cloudflare";

import { GET } from "@/app/api/health/route";

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: vi.fn(),
}));

describe("GET /api/health", () => {
  it("returns ok when database is reachable", async () => {
    const first = vi.fn().mockResolvedValue({ ok: 1 });
    const prepare = vi.fn(() => ({ first }));
    const getCloudflareContextMock = vi.mocked(getCloudflareContext);

    getCloudflareContextMock.mockResolvedValue({
      env: {
        DB: {
          prepare,
        },
      },
    } as unknown as Awaited<ReturnType<typeof getCloudflareContext>>);

    const response = await GET();

    expect(prepare).toHaveBeenCalledWith("SELECT 1");
    expect(first).toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
