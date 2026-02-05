import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

type D1Binding = {
  prepare: (query: string) => {
    first: () => Promise<unknown>;
  };
};

type HealthEnv = {
  DB: D1Binding;
};

export async function GET() {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = (env as HealthEnv).DB;

    await db.prepare("SELECT 1").first();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Health check failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
