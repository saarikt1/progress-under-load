import { NextResponse } from "next/server";

import {
  clearSessionCookie,
  deleteSessionByToken,
  getAuthEnv,
  getCookieValue,
  getSessionCookieName,
} from "@/server/auth";

export async function POST(request: Request) {
  try {
    const env = await getAuthEnv();
    const db = env.DB;
    const token = getCookieValue(request, getSessionCookieName());

    if (token) {
      await deleteSessionByToken(db, token);
    }

    const response = NextResponse.json({ ok: true });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    console.error("Logout failed", error);
    const response = NextResponse.json({ ok: true });
    clearSessionCookie(response);
    return response;
  }
}
