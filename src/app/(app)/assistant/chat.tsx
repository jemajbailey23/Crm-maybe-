"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { askAssistant, type ChatMessage, type ArticleSource } from "./actions";

const EXAMPLE_PROMPTS = [
  "Show leads needing follow-up",
  "Show overdue invoices",
  "Summarize today's work",
  "Draft a proposal",
  "Create a follow-up email",
  "Summarize client history",
  "Find businesses without websites",
  "Show highest-value clients",
  "Suggest today's priorities",
];

type DisplayMessage = ChatMessage & { id: string; error?: boolean; sources?: ArticleSource[] };

export function AssistantChat() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  }

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isPending) return;

    const history = messages.map(({ role, content }) => ({ role, content }));
    const userMessage: DisplayMessage = { id: crypto.randomUUID(), role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    scrollToBottom();

    startTransition(async () => {
      const result = await askAssistant(history, trimmed);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.error ?? result.reply,
          error: !!result.error,
          sources: result.sources,
        },
      ]);
      scrollToBottom();
    });
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 ? (
          <div className="animate-fade-in">
            <p className="mb-3 text-sm text-zinc-500">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => send(prompt)}
                  className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-indigo-500/40 hover:text-indigo-300"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-indigo-500 text-white"
                    : m.error
                      ? "border border-red-500/30 bg-red-500/10 text-red-300"
                      : "border border-zinc-800 bg-zinc-900 text-zinc-200"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-zinc-800 pt-2">
                    <span className="text-xs text-zinc-500">Sources:</span>
                    {m.sources.map((s) => (
                      <Link
                        key={s.id}
                        href={`/knowledge/${s.id}`}
                        className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-indigo-300 transition-colors hover:bg-zinc-700"
                      >
                        {s.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isPending && (
          <div className="flex justify-start">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-500">
              Thinking…
            </div>
          </div>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 border-t border-zinc-800 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the assistant…"
          disabled={isPending}
          className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isPending || !input.trim()}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
