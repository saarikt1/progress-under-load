import { describe, expect, it } from "vitest";

import { getSecurityHeaders } from "@/lib/security-headers";

describe("getSecurityHeaders", () => {
  it("returns the expected baseline security headers", () => {
    const [globalConfig] = getSecurityHeaders({ isDev: false });

    expect(globalConfig).toBeDefined();
    expect(globalConfig?.source).toBe("/(.*)");

    const headers = Object.fromEntries(
      (globalConfig?.headers ?? []).map((header) => [header.key, header.value])
    );

    expect(headers["Content-Security-Policy"]).toBeTruthy();
    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(headers["Content-Security-Policy"]).toContain("base-uri 'self'");
    expect(headers["Content-Security-Policy"]).toContain("form-action 'self'");
    expect(headers["Content-Security-Policy"]).toContain("object-src 'none'");
    expect(headers["Content-Security-Policy"]).toContain("upgrade-insecure-requests");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Permissions-Policy"]).toBeTruthy();
    expect(headers["Strict-Transport-Security"]).toBeTruthy();
  });
});
