import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateText } from "@/server/llm";

const makeFakeEnv = (overrides = {}) =>
    ({
        LLM_API_KEY: "sk-test",
        LLM_BASE_URL: "https://api.test/v1",
        LLM_MODEL: "test-model",
        ...overrides,
    }) as any;

describe("generateText", () => {
    let fetchSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        fetchSpy = vi.spyOn(global, "fetch");
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("throws when LLM_API_KEY is not configured", async () => {
        await expect(
            generateText("hello", makeFakeEnv({ LLM_API_KEY: undefined }))
        ).rejects.toThrow("LLM_API_KEY not configured");
    });

    it("sends max_tokens of at least 800 to avoid mid-sentence truncation", async () => {
        fetchSpy.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    choices: [{ message: { content: "Great work!" } }],
                }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            )
        );

        await generateText("Some prompt", makeFakeEnv());

        const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
        expect(body.max_tokens).toBeGreaterThanOrEqual(800);
    });

    it("returns the trimmed content from the LLM response", async () => {
        fetchSpy.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    choices: [{ message: { content: "  Nice progress!  " } }],
                }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            )
        );

        const result = await generateText("Some prompt", makeFakeEnv());
        expect(result).toBe("Nice progress!");
    });

    it("throws when the LLM API returns a non-ok response", async () => {
        fetchSpy.mockResolvedValueOnce(
            new Response("Bad request", { status: 400 })
        );

        await expect(generateText("hello", makeFakeEnv())).rejects.toThrow(
            "LLM request failed: 400"
        );
    });
});
