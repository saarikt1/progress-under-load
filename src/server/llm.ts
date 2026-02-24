import type { AuthEnv } from "@/server/auth";

export async function generateText(prompt: string, env: AuthEnv): Promise<string> {
  const apiKey = env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error("LLM_API_KEY not configured");
  }

  const baseUrl = env.LLM_BASE_URL ?? "https://api.openai.com/v1";
  const model = env.LLM_MODEL ?? "gpt-4o-mini";

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM request failed: ${response.status} ${text}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
  };

  return data.choices[0]?.message?.content?.trim() ?? "";
}
