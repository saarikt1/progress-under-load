import { NextRequest, NextResponse } from "next/server";
import { getAuthEnv, getSessionByToken, getCookieValue, getSessionCookieName } from "@/server/auth";

export const runtime = "edge";

export async function PATCH(request: NextRequest) {
  try {
    const env = await getAuthEnv();
    const db = env.DB;

    const sessionToken = getCookieValue(request, getSessionCookieName());
    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await getSessionByToken(db, sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as { program_prompt?: string };
    const programPrompt = body.program_prompt ?? "";

    if (typeof programPrompt !== "string") {
      return NextResponse.json({ error: "program_prompt must be a string" }, { status: 400 });
    }
    if (programPrompt.length > 2000) {
      return NextResponse.json({ error: "program_prompt exceeds 2000 characters" }, { status: 400 });
    }

    await db
      .prepare("UPDATE users SET program_prompt = ? WHERE id = ?")
      .bind(programPrompt || null, session.user.id)
      .run();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Chat program PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
