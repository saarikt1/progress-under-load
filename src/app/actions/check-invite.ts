"use server";

import { getAuthEnv, hashSessionToken } from "@/server/auth";

export async function checkInviteAction(code: string) {
    const env = await getAuthEnv();
    const codeHash = await hashSessionToken(code);
    const now = new Date().toISOString();

    const invite = await env.DB
        .prepare(
            "SELECT id FROM invites WHERE code_hash = ? AND used_at IS NULL AND expires_at > ?"
        )
        .bind(codeHash, now)
        .first();

    return { isValid: !!invite };
}
