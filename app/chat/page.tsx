"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useEffectEvent } from "react";
import { SESSION_STORAGE_KEY } from "@/lib/constants";
import { safeCitationHref } from "@/lib/chat/safe-citation-url";
import type { ChatMessage, ChatResponse, SessionPublic } from "@/types/session";

const SUGGESTIONS = [
  "Can I sublet?",
  "Is this deposit legal?",
  "Can the landlord keep my full deposit?",
];

/**
 * Chat — grounded Q&A with citation pills.
 */
export default function ChatPage() {
  const router = useRouter();
  const [title, setTitle] = useState("Your lease");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const tokenRef = useRef<string | null>(null);

  const scrollToBottom = useEffectEvent(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  });

  useEffect(() => {
    const token = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!token) {
      router.replace("/");
      return;
    }
    tokenRef.current = token;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/session/${encodeURIComponent(token)}`);
        const data = (await res.json()) as
          | SessionPublic
          | { error: { code: string; message: string } };
        if (cancelled) return;
        if (!res.ok || "error" in data) {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
          setError(
            "error" in data
              ? data.error.message
              : "Session expired. Please upload again.",
          );
          return;
        }
        setTitle(data.title);
        setMessages([
          {
            role: "assistant",
            content:
              "I've read your lease. Ask me about deposits, notice periods, subletting, or anything else in the agreement.",
          },
        ]);
      } catch {
        if (!cancelled) {
          setError("Could not load your session. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  async function sendMessage(raw: string) {
    const text = raw.trim();
    if (!text || sending) return;
    const token = tokenRef.current;
    if (!token) {
      router.replace("/");
      return;
    }

    setError(null);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setSending(true);

    try {
      const res = await fetch(
        `/api/session/${encodeURIComponent(token)}/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        },
      );
      const body = (await res.json()) as
        | ChatResponse
        | { error: { code: string; message: string } };

      if (!res.ok || "error" in body) {
        if (res.status === 404) {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }
        setError(
          "error" in body
            ? body.error.message
            : "Could not answer that question.",
        );
        return;
      }

      setTitle(body.title);
      // Prefer server history; keep the local greeting if server history is empty of greetings
      const serverMsgs = body.messages;
      setMessages((prev) => {
        const greeting = prev.find(
          (m) =>
            m.role === "assistant" &&
            m.content.startsWith("I've read your lease"),
        );
        if (greeting && serverMsgs.length > 0) {
          return [greeting, ...serverMsgs];
        }
        return serverMsgs.length > 0 ? serverMsgs : [...prev, body.reply];
      });
    } catch {
      setError("Could not answer that question. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (loading && !error) {
    return (
      <div className="mx-auto flex min-h-full max-w-md items-center justify-center px-5 py-16 text-ink-muted">
        Opening chat…
      </div>
    );
  }

  if (error && messages.length === 0) {
    return (
      <div className="mx-auto flex min-h-full max-w-md flex-col gap-4 px-5 py-16">
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm">
          {error}
        </p>
        <Link
          href="/overview"
          className="text-sm font-semibold text-primary underline"
        >
          Back to Overview
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-5 pb-4 pt-6">
      <header className="flex items-start gap-3">
        <Link
          href="/overview"
          aria-label="Back to overview"
          className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink hover:bg-primary-soft"
        >
          <ChevronLeft />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
            Chat
          </h1>
          <p className="mt-1 truncate text-sm text-ink-muted">{title}</p>
        </div>
      </header>

      <div className="mt-6 flex flex-1 flex-col gap-3 overflow-y-auto">
        {messages.map((m, i) => (
          <MessageBubble key={`${m.role}-${i}`} message={m} />
        ))}
        {sending ? (
          <p className="text-sm text-ink-muted" aria-live="polite">
            Thinking…
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm">
            {error}
          </p>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <div className="mt-4 shrink-0">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              disabled={sending}
              onClick={() => void sendMessage(s)}
              className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          className="mt-2 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage(input);
          }}
        >
          <label className="sr-only" htmlFor="chat-input">
            Ask about your lease
          </label>
          <input
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
            placeholder="Ask about your lease…"
            className="min-w-0 flex-1 rounded-full border border-border bg-card px-4 py-3 text-sm text-ink placeholder:text-ink-muted"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            aria-label="Send message"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-50"
          >
            <SendIcon />
          </button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          isUser
            ? "max-w-[85%] rounded-2xl bg-primary px-4 py-3 text-sm text-white"
            : "max-w-[90%] rounded-2xl border border-border bg-card px-4 py-3 text-sm text-ink"
        }
      >
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        {message.citations && message.citations.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {message.citations.map((c) => {
              const href = safeCitationHref(c.sourceUrl);
              const className =
                "rounded-full bg-canvas px-2.5 py-1 text-[11px] font-medium text-ink-muted";
              return (
                <li key={c.id}>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${className} underline-offset-2 hover:underline`}
                    >
                      {c.label}
                    </a>
                  ) : (
                    <span className={className}>{c.label}</span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function ChevronLeft() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12.5 4.5L7 10l5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 10h10M10 4l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
