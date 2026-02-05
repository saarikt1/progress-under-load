import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/server/auth";

describe("password hashing", () => {
  it("hashes with pbkdf2 and verifies correctly", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");

    expect(hash.startsWith("pbkdf2$sha256$")).toBe(true);
    await expect(verifyPassword("correct-horse-battery-staple", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });
});
