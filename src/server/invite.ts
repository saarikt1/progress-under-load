import {
    type D1Database,
    createId,
    hashPassword,
    hashSessionToken,
    normalizeEmail,
} from "@/server/auth";

// Temporary type definition if not available elsewhere (based on auth.ts reading)
// In a real scenario I might refactor types to specific file
type D1PreparedStatement = {
    bind: (...args: unknown[]) => D1PreparedStatement;
    first: <T = Record<string, unknown>>(columnName?: string) => Promise<T | null>;
    all: <T = Record<string, unknown>>() => Promise<{ results: T[] }>;
    run: () => Promise<{ success: boolean }>;
};

type D1DatabaseLike = {
    prepare: (query: string) => D1PreparedStatement;
};

// Re-export or redefine types as needed.
// Ideally verifyPassword etc should be imported.

export type InviteRow = {
    id: string;
    email: string;
    code_hash: string;
    expires_at: string;
    created_by_user_id: string;
    created_at: string;
};

const INVITE_TTL_DAYS = 7;

export async function createInvite(
    db: D1DatabaseLike,
    email: string,
    creatorId: string
) {
    const normalizedEmail = normalizeEmail(email);
    const code = createId() + createId(); // 32+ chars of entropy
    const codeHash = await hashSessionToken(code);
    const expiresAt = new Date(
        Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();
    const id = createId();

    await db
        .prepare(
            "INSERT INTO invites (id, email, code_hash, created_by_user_id, expires_at) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(id, normalizedEmail, codeHash, creatorId, expiresAt)
        .run();

    return { code, id, email: normalizedEmail, expiresAt };
}

export async function listInvites(db: D1Database) {
    // Select invites that haven't been used yet (used_at is null) and not expired?
    // The table schema has used_at. Code says "invites expire".
    // Let's return all valid (not expired, not used)
    const now = new Date().toISOString();

    const result = await db
        .prepare(
            "SELECT * FROM invites WHERE used_at IS NULL AND expires_at > ? ORDER BY created_at DESC"
        )
        .bind(now)
        .all<InviteRow>();

    return result.results;
}

export async function revokeInvite(db: D1Database, inviteId: string) {
    await db.prepare("DELETE FROM invites WHERE id = ?").bind(inviteId).run();
}

export async function getInviteByCode(db: D1Database, code: string) {
    const codeHash = await hashSessionToken(code);
    const now = new Date().toISOString();

    const invite = await db
        .prepare(
            "SELECT * FROM invites WHERE code_hash = ? AND used_at IS NULL AND expires_at > ?"
        )
        .bind(codeHash, now)
        .first<InviteRow>();

    return invite;
}

export async function acceptInvite(
    db: D1Database,
    code: string,
    password: string,
    envAuth?: any // Pass env for password hashing config
) {
    const invite = await getInviteByCode(db, code);

    if (!invite) {
        throw new Error("Invalid or expired invite code");
    }

    // Double check user doesn't exist
    const existingUser = await db
        .prepare("SELECT id FROM users WHERE email = ?")
        .bind(invite.email)
        .first();

    if (existingUser) {
        // If user exists, we might want to just mark invite used or throw?
        // Let's throw for now.
        throw new Error("User already exists");
    }

    const userId = createId();
    const passwordHash = await hashPassword(password, envAuth);

    // Transaction would be nice but D1 doesn't support generic batching easily in all client wrapper variations. 
    // We'll do sequential operations. Risk of orphan user if delete invite fails, but acceptable for MVP.

    // 1. Create User
    await db
        .prepare("INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)")
        .bind(userId, invite.email, passwordHash, "user")
        .run();

    // 2. Mark invite used (or delete)
    // Schema has `used_at`, so let's update it.
    await db
        .prepare("UPDATE invites SET used_at = ? WHERE id = ?")
        .bind(new Date().toISOString(), invite.id)
        .run();

    return { userId, email: invite.email };
}
