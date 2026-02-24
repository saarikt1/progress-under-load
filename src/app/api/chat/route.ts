import { NextRequest, NextResponse } from "next/server";
import { getAuthEnv, getSessionByToken, getCookieValue, getSessionCookieName } from "@/server/auth";
import { generateChatResponse } from "@/server/llm";
import { buildChatSystemPrompt } from "@/server/chat-context";

export const runtime = "edge";

export async function GET(request: NextRequest) {
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

    const userId = session.user.id;

    const [messagesResult, userRow] = await Promise.all([
      db
        .prepare(
          `SELECT id, role, content, created_at FROM chat_messages
           WHERE user_id = ?
           ORDER BY created_at ASC
           LIMIT 100`
        )
        .bind(userId)
        .all<{ id: string; role: string; content: string; created_at: string }>(),
      db
        .prepare("SELECT program_prompt FROM users WHERE id = ?")
        .bind(userId)
        .first<{ program_prompt: string | null }>(),
    ]);

    return NextResponse.json({
      messages: messagesResult.results,
      program_prompt: userRow?.program_prompt ?? null,
    });
  } catch (error) {
    console.error("Chat GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

    const userId = session.user.id;

    const body = await request.json() as { content?: string };
    const content = body.content?.trim() ?? "";

    if (!content) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }
    if (content.length > 2000) {
      return NextResponse.json({ error: "content exceeds 2000 characters" }, { status: 400 });
    }

    if (!env.LLM_API_KEY) {
      return NextResponse.json({ error: "LLM not configured" }, { status: 503 });
    }

    // Prune messages older than 90 days
    await db
      .prepare(
        "DELETE FROM chat_messages WHERE user_id = ? AND created_at < datetime('now', '-90 days')"
      )
      .bind(userId)
      .run();

    // Insert user message
    const userMessageId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db
      .prepare(
        "INSERT INTO chat_messages (id, user_id, role, content, created_at) VALUES (?, ?, 'user', ?, ?)"
      )
      .bind(userMessageId, userId, content, now)
      .run();

    // Fetch last 20 messages for LLM context (includes the one we just inserted)
    const historyResult = await db
      .prepare(
        `SELECT role, content FROM chat_messages
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 20`
      )
      .bind(userId)
      .all<{ role: string; content: string }>();

    // Reverse to chronological order
    const history = historyResult.results.reverse();

    // Build system prompt
    const systemPrompt = await buildChatSystemPrompt(db, userId);

    // Call LLM
    const llmMessages = [
      { role: "system" as const, content: systemPrompt },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const reply = await generateChatResponse(llmMessages, env);

    // Insert assistant reply
    const assistantMessageId = crypto.randomUUID();
    const replyTime = new Date().toISOString();

    await db
      .prepare(
        "INSERT INTO chat_messages (id, user_id, role, content, created_at) VALUES (?, ?, 'assistant', ?, ?)"
      )
      .bind(assistantMessageId, userId, reply, replyTime)
      .run();

    return NextResponse.json({
      message: {
        id: assistantMessageId,
        role: "assistant",
        content: reply,
        created_at: replyTime,
      },
    });
  } catch (error) {
    console.error("Chat POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
