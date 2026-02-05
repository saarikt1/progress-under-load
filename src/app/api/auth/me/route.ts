import { NextResponse } from "next/server";

import { getAuthEnv, getCookieValue, getSessionByToken, getSessionCookieName } from "@/server/auth";

export async function GET(request: Request) {
  try {
    const env = await getAuthEnv();
    const token = getCookieValue(request, getSessionCookieName());

    if (!token) {
      return NextResponse.json({ user: null });
    }

    const session = await getSessionByToken(env.DB, token);
    if (!session) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user: session.user });
  } catch (error) {
    console.error("Auth check failed", error);
    return NextResponse.json({ user: null });
  }
}
