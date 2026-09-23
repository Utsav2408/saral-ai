"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useEffectEvent } from "react";
import {
  ActivityError,
  ActivityHeader,
  ActivityLoading,
} from "@/components/ActivityChrome";
import { CitationPills } from "@/components/CitationPills";
import { ErrorPanel } from "@/components/ErrorPanel";
import { mapApiErrorFromBody } from "@/lib/api/map-api-error";
import { sessionExpiredHomeHref } from "@/lib/client/fetch-activity";
import { SESSION_STORAGE_KEY } from "@/lib/constants";
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const liveRef = useRef<HTMLDivElement | null>(null);
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
          router.replace(sessionExpiredHomeHref());
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
          setLoadError("Could not load your session. Please try again.");
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
          router.replace(sessionExpiredHomeHref());
          return;
        }
        // Restore draft; do not leave an orphan user bubble.
        setInput(text);
        setError(
          mapApiErrorFromBody(
            res.status,
            body,
            "Could not answer that question.",
          ),
        );
        return;
      }

      setTitle(body.title);
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
      if (liveRef.current) {
        liveRef.current.textContent = "New reply from Clarity.";
      }
    } catch {
      setInput(text);
      setError("Could not answer that question. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (loading && !loadError) {
    return <ActivityLoading>Opening chat…</ActivityLoading>;
  }

  if (loadError) {
    return <ActivityError message={loadError} showHomeLink />;
  }

  return (
    <main
      id="main"
      className="mx-auto flex min-h-full w-full max-w-md flex-col px-5 pb-4 pt-6"
    >
      <ActivityHeader title="Chat" subtitle={title} large />

      <div className="mt-6 flex flex-1 flex-col gap-3 overflow-y-auto">
        {messages.map((m, i) => (
          <MessageBubble key={`${m.role}-${i}`} message={m} />
        ))}
        {sending ? (
          <p className="text-sm text-ink-muted" aria-live="polite">
            Thinking…
          </p>
        ) : null}
        <div ref={liveRef} className="sr-only" aria-live="polite" />
        {error ? (
          <ErrorPanel
            message={error}
            onRetry={() => {
              const draft = input.trim();
              if (draft) void sendMessage(draft);
            }}
          />
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
    </main>
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
          <CitationPills
            citations={message.citations}
            pillClassName="rounded-full bg-canvas px-2.5 py-1 text-[11px] font-medium text-ink-muted"
          />
        ) : null}
      </div>
    </div>
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
