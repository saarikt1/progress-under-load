import { describe, expect, it, vi, beforeEach } from "vitest";
import {
    createInvite,
    listInvites,
    revokeInvite,
    getInviteByCode,
    acceptInvite,
} from "@/server/invite";
import { hashSessionToken, normalizeEmail } from "@/server/auth";

// Mock auth functions that are expensive or hard to track (like random bytes) if necessary
// But our auth.ts implementation is pure JS so perfectly fine to run real code.

describe("InviteService", () => {
    let mockDb: any;
    let mockPrepare: any;
    let mockBind: any;
    let mockRun: any;
    let mockAll: any;
    let mockFirst: any;

    beforeEach(() => {
        mockRun = vi.fn().mockResolvedValue({ success: true });
        mockAll = vi.fn().mockResolvedValue({ results: [] });
        mockFirst = vi.fn().mockResolvedValue(null);
        mockBind = vi.fn().mockReturnValue({
            run: mockRun,
            all: mockAll,
            first: mockFirst,
            bind: () => ({ run: mockRun, all: mockAll, first: mockFirst }), // Chainable
        });
        mockPrepare = vi.fn().mockReturnValue({
            bind: mockBind,
        });
        mockDb = {
            prepare: mockPrepare,
        };
    });

    describe("createInvite", () => {
        it("generates code and inserts into db", async () => {
            const email = "test@example.com";
            const creatorId = "admin-123";

            const result = await createInvite(mockDb, email, creatorId);

            expect(result.email).toBe("test@example.com");
            expect(result.code.length).toBeGreaterThan(32);

            expect(mockPrepare).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO invites")
            );
            // The exact bind args are hard to check because of dynamic ID/Dates, but we can verify email and creator
            expect(mockBind).toHaveBeenCalledWith(
                expect.any(String), // id
                "test@example.com", // email
                expect.any(String), // code_hash
                creatorId,
                expect.any(String)  // expires_at
            );
        });
    });

    describe("acceptInvite", () => {
        it("throws if invite invalid", async () => {
            mockFirst.mockResolvedValue(null); // No invite found

            await expect(
                acceptInvite(mockDb, "some-code", "password123")
            ).rejects.toThrow("Invalid or expired invite code");
        });

        it("creates user and marks invite used", async () => {
            const code = "valid-code-123";
            // We need to match the hash logic
            const codeHash = await hashSessionToken(code);

            // Mock finding the invite
            mockFirst.mockResolvedValueOnce({
                id: "invite-1",
                email: "invited@example.com",
                code_hash: codeHash,
            });

            // Mock finding NO existing user
            mockFirst.mockResolvedValueOnce(null);

            await acceptInvite(mockDb, code, "password123");

            // Verify user insertion
            expect(mockPrepare).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO users")
            );
            expect(mockBind).toHaveBeenCalledWith(
                expect.any(String), // id
                "invited@example.com",
                expect.stringMatching(/^pbkdf2/), // password hash
                "user"
            );

            // Verify invite update
            expect(mockPrepare).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE invites SET used_at")
            );
        });

        it("throws if user already exists", async () => {
            // Mock finding the invite
            mockFirst.mockResolvedValueOnce({
                id: "invite-1",
                email: "existing@example.com",
            });

            // Mock finding EXISTING user
            mockFirst.mockResolvedValueOnce({ id: "user-1" });

            await expect(
                acceptInvite(mockDb, "code", "password123")
            ).rejects.toThrow("User already exists");
        });
    });
});
