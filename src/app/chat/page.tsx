"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [programPrompt, setProgramPrompt] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [savingProgram, setSavingProgram] = useState(false);
  const [programSaved, setProgramSaved] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((data: { messages: Message[]; program_prompt: string | null }) => {
        setMessages(data.messages ?? []);
        setProgramPrompt(data.program_prompt ?? "");
      })
      .catch(() => {})
      .finally(() => setInitialLoading(false));
  }, []);

  useEffect(() => {
    if (!initialLoading) {
      scrollToBottom();
    }
  }, [messages, initialLoading, scrollToBottom]);

  const sendMessage = useCallback(async () => {
    const content = input.trim();
    if (!content || loading) return;

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      const data = await response.json() as {
        message?: Message;
        error?: string;
      };

      if (!response.ok || !data.message) {
        throw new Error(data.error ?? "Failed to get response");
      }

      setMessages((prev) => [...prev, data.message!]);
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setInput(content);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  const saveProgram = useCallback(async () => {
    setSavingProgram(true);
    try {
      await fetch("/api/chat/program", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ program_prompt: programPrompt }),
      });
      setProgramSaved(true);
      setTimeout(() => setProgramSaved(false), 2000);
    } catch {
      // ignore
    } finally {
      setSavingProgram(false);
    }
  }, [programPrompt]);

  return (
    <section className="flex flex-col h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <h1 className="text-xl font-semibold">Chat with your coach</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setContextOpen((o) => !o)}
        >
          {contextOpen ? "Close context" : "Edit context"}
        </Button>
      </header>

      {/* Collapsible program prompt panel */}
      {contextOpen && (
        <div className="border-b px-4 py-3 shrink-0 space-y-2 bg-muted/40">
          <p className="text-sm font-medium">Training program</p>
          <p className="text-xs text-muted-foreground">
            Describe your current program, goals, and any context the coach should know.
          </p>
          <textarea
            className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            rows={4}
            placeholder="E.g. Running 5/3/1 powerlifting, 4 days/week. Goal: 200kg squat by end of year."
            value={programPrompt}
            onChange={(e) => setProgramPrompt(e.target.value)}
            maxLength={2000}
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={saveProgram} disabled={savingProgram}>
              {savingProgram ? "Saving…" : "Save"}
            </Button>
            {programSaved && (
              <span className="text-xs text-muted-foreground">Saved</span>
            )}
          </div>
        </div>
      )}

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {initialLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 rounded-xl bg-muted animate-pulse"
                style={{ width: `${50 + i * 10}%` }}
              />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-2 text-muted-foreground">
            <p className="text-base font-medium">Ask your coach anything about your training.</p>
            <p className="text-sm">Your workout history is loaded as context automatically.</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted rounded-bl-sm"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            </div>
          ))
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t px-4 py-3 shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            className="flex-1 rounded-xl border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring min-h-[2.5rem] max-h-40"
            rows={1}
            placeholder="Ask your coach…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            maxLength={2000}
          />
          <Button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            size="sm"
            className="shrink-0"
          >
            Send
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Enter to send · Shift+Enter for newline</p>
      </div>
    </section>
  );
}
