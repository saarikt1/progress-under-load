"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import {
    getAuthEnv,
    getSessionCookieName,
    getCookieValue,
    getSessionByToken,
    setSessionCookie,
    createSession,
    clearSessionCookie,
} from "@/server/auth";
import {
    createInvite,
    revokeInvite,
    listInvites,
    acceptInvite,
} from "@/server/invite";

async function getAuthenticatedUser() {
    const env = await getAuthEnv();
    const requestHeaders = await headers();
    // We need to mimic Request to extract cookie manually or use cookies()
    // But our utils use generic Request. Let's use `cookies()` from next/headers
    // Actually, getCookieValue takes a Request.
    // Let's use `cookies()` which is easier in Server Actions.

    // Wait, let's just use cookies()
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get(getSessionCookieName())?.value;

    if (!token) return null;

    return getSessionByToken(env.DB, token);
}

async function ensureAdmin() {
    const session = await getAuthenticatedUser();
    if (!session || session.user.role !== "admin") {
        throw new Error("Unauthorized");
    }
    return session;
}

export async function createInviteAction(formData: FormData) {
    const session = await ensureAdmin();
    const env = await getAuthEnv();

    const email = formData.get("email");
    if (typeof email !== "string" || !email) {
        return { error: "Email is required" };
    }

    try {
        const invite = await createInvite(env.DB, email, session.user.id);
        revalidatePath("/admin");
        return { success: true, invite };
    } catch (error) {
        console.error("Create invite failed", error);
        return { error: "Failed to create invite" };
    }
}

export async function revokeInviteAction(inviteId: string) {
    await ensureAdmin();
    const env = await getAuthEnv();

    try {
        await revokeInvite(env.DB, inviteId);
        revalidatePath("/admin");
        return { success: true };
    } catch (error) {
        return { error: "Failed to revoke invite" };
    }
}

export async function redeemInviteAction(prevState: any, formData: FormData) {
    const code = formData.get("code");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    if (typeof code !== "string" || !code) {
        return { error: "Invalid code" };
    }
    if (typeof password !== "string" || password.length < 12) {
        return { error: "Password must be at least 12 characters" };
    }
    if (password !== confirmPassword) {
        return { error: "Passwords do not match" };
    }

    const env = await getAuthEnv();

    try {
        // 1. Accept Invite & Create User
        const { userId } = await acceptInvite(env.DB, code, password, env);

        // 2. Create Session
        const { token } = await createSession(env.DB, userId, env);

        // 3. Set Cookie
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();

        // We need to reimplement setSessionCookie for cookieStore (since auth.ts uses generic response-like object)
        // Or adjust auth.ts. For now, let's manual toggle.
        // Actually auth.ts: setSessionCookie takes { cookies: { set: ... } }
        // cookieStore has .set, so it matches!
        setSessionCookie({ cookies: cookieStore }, token, env);

        // 4. Redirect
    } catch (error) {
        console.error("Redeem invite failed", error);
        if (error instanceof Error && error.message.includes("User already exists")) {
            return { error: "User already registered" };
        }
        return { error: "Invalid or expired invite" };
    }

    redirect("/");
}
