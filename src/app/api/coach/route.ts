import { NextRequest, NextResponse } from "next/server";
import { getAuthEnv, getSessionByToken, getCookieValue, getSessionCookieName } from "@/server/auth";
import { generateAndStoreCoachComment } from "@/server/coach";

export async function POST(request: NextRequest) {
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

    const body = await request.json() as { import_id?: string };
    if (!body.import_id) {
      return NextResponse.json({ error: "import_id is required" }, { status: 400 });
    }

    if (!env.LLM_API_KEY) {
      return NextResponse.json({ comment: null, reason: "not_configured" });
    }

    const comment = await generateAndStoreCoachComment(
      db,
      session.user.id,
      body.import_id,
      env
    );

    return NextResponse.json({ comment });
  } catch (error) {
    console.error("Coach comment error:", error);
    return NextResponse.json({ comment: null, reason: "error" });
  }
}
