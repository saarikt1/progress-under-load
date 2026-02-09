import { NextResponse } from "next/server";

import {
  createSession,
  ensureAdminBootstrap,
  findUserByEmail,
  getAuthEnv,
  getPasswordMinLength,
  normalizeEmail,
  setSessionCookie,
  verifyPassword,
} from "@/server/auth";
import { createRateLimiter } from "@/server/rate-limit";

const loginRateLimiter = createRateLimiter({ limit: 5, windowMs: 15 * 60 * 1000 });

export function __resetLoginRateLimiter() {
  loginRateLimiter.reset();
}

type LoginPayload = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  let payload: LoginPayload;

  try {
    payload = (await request.json()) as LoginPayload;
  } catch {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const email = typeof payload.email === "string" ? normalizeEmail(payload.email) : "";
  const password = typeof payload.password === "string" ? payload.password : "";

  const limiterKey = `${getClientIp(request)}:${email || "unknown"}`;
  if (loginRateLimiter.isLimited(limiterKey)) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  if (!email || password.length < getPasswordMinLength()) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  try {
    const env = await getAuthEnv();
    const db = env.DB;

    let user = await findUserByEmail(db, email);

    // If the user is not found, it might be because the database is empty
    // and we need to bootstrap the admin user. This check only runs if
    // the email matches the configured admin email.
    if (!user && email === normalizeEmail(env.ADMIN_EMAIL ?? "")) {
      await ensureAdminBootstrap(db, env);
      user = await findUserByEmail(db, email);
    }

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (!user.password_hash) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const session = await createSession(db, user.id, env);
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });

    setSessionCookie(response, session.token, env);
    return response;
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ error: "Unable to login" }, { status: 500 });
  }
}

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }

  return request.headers.get("cf-connecting-ip") ?? "unknown";
}
