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
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLocale } from "@/components/LocaleProvider";
import { mapApiErrorFromBody } from "@/lib/api/map-api-error";
import { sessionExpiredHomeHref } from "@/lib/client/fetch-activity";
import { SESSION_STORAGE_KEY } from "@/lib/constants";
import type { MessageKey } from "@/lib/i18n/messages";
import type { ChatMessage, ChatResponse, SessionPublic } from "@/types/session";

const SUGGESTION_KEYS = [
  "chat.suggestion.sublet",
  "chat.suggestion.depositLegal",
  "chat.suggestion.depositKeep",
] as const satisfies readonly MessageKey[];

/**
 * Chat — grounded Q&A with citation pills.
 */
export default function ChatPage() {
  const router = useRouter();
  const { locale, t } = useLocale();
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
            content: t("chat.greeting"),
          },
        ]);
      } catch {
        if (!cancelled) {
          setLoadError(t("chat.loadError"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, t]);

  // Refresh local greeting when language changes (only before any chat turns).
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length !== 1 || prev[0]?.role !== "assistant") return prev;
      return [{ role: "assistant", content: t("chat.greeting") }];
    });
  }, [locale, t]);

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
          body: JSON.stringify({ message: text, locale }),
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
        setInput(text);
        setError(
          mapApiErrorFromBody(
            res.status,
            body,
            t("chat.error"),
          ),
        );
        return;
      }

      setTitle(body.title);
      const serverMsgs = body.messages;
      setMessages((prev) => {
        const localGreetingOnly =
          prev.length === 1 && prev[0]?.role === "assistant";
        if (localGreetingOnly && serverMsgs.length > 0) {
          return [prev[0], ...serverMsgs];
        }
        return serverMsgs.length > 0 ? serverMsgs : [...prev, body.reply];
      });
      if (liveRef.current) {
        liveRef.current.textContent = t("chat.liveReply");
      }
    } catch {
      setInput(text);
      setError(t("chat.errorRetry"));
    } finally {
      setSending(false);
    }
  }

  if (loading && !loadError) {
    return <ActivityLoading>{t("chat.loading")}</ActivityLoading>;
  }

  if (loadError) {
    return <ActivityError message={loadError} showHomeLink />;
  }

  return (
    <main
      id="main"
      className="mx-auto flex min-h-full w-full max-w-md flex-col px-5 pb-4 pt-6"
    >
      <ActivityHeader
        title={t("chat.title")}
        subtitle={title}
        large
        end={<LanguageToggle />}
      />

      <div className="mt-6 flex flex-1 flex-col gap-3 overflow-y-auto">
        {messages.map((m, i) => (
          <MessageBubble key={`${m.role}-${i}`} message={m} />
        ))}
        {sending ? (
          <p className="text-sm text-ink-muted" aria-live="polite">
            {t("chat.thinking")}
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
          {SUGGESTION_KEYS.map((key) => {
            const s = t(key);
            return (
              <button
                key={key}
                type="button"
                disabled={sending}
                onClick={() => void sendMessage(s)}
                className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-50"
              >
                {s}
              </button>
            );
          })}
        </div>
        <form
          className="mt-2 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage(input);
          }}
        >
          <label className="sr-only" htmlFor="chat-input">
            {t("chat.inputLabel")}
          </label>
          <input
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
            placeholder={t("chat.placeholder")}
            className="min-w-0 flex-1 rounded-full border border-border bg-card px-4 py-3 text-sm text-ink placeholder:text-ink-muted"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            aria-label={t("chat.send")}
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
