"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowUp,
  Bot,
  Loader2,
  Sparkles,
  User,
  Wallet,
} from "lucide-react";
import { MessageContent } from "@/components/chat/message-content";
import { CopyButton } from "@/components/chat/copy-button";
import { ResponseActions } from "@/components/chat/response-actions";
import { useChatPreferences } from "@/components/chat/chat-preferences";
import { ModeBadge } from "@/components/chat/mode-badge";
import { aiModels, type AiModelId } from "@/config/ai-models";
import type { ChatMode } from "@/config/ai-models";

type DbMessage = {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  createdAt: string | Date;
};

type ChatPanelProps = {
  conversationId: string;
  conversationTitle: string;
  conversationMode: ChatMode;
  initialCredits: number;
  initialMessages: DbMessage[];
};

type UiMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

const quickPrompts = [
  "Summarize the next steps",
  "Turn this into a checklist",
  "Give me the technical plan",
];

function mapRole(role: DbMessage["role"]): UiMessage["role"] {
  if (role === "USER") return "user";
  if (role === "ASSISTANT") return "assistant";
  return "system";
}

function extractTextFromStreamChunk(chunk: string) {
  let text = "";

  for (const rawLine of chunk.split("\n")) {
    const line = rawLine.trim();

    if (!line || line === "data: [DONE]") {
      continue;
    }

    if (line.startsWith("data:")) {
      try {
        const part = JSON.parse(line.slice(5).trim()) as {
          type?: string;
          delta?: string;
        };

        if (part.type === "text-delta" && part.delta) {
          text += part.delta;
        }
      } catch {
        continue;
      }
    }

    if (line.startsWith("0:")) {
      try {
        text += JSON.parse(line.slice(2));
      } catch {
        continue;
      }
    }
  }

  return text;
}

export function ChatPanel({
  conversationId,
  conversationTitle,
  conversationMode,
  initialCredits,
  initialMessages,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<UiMessage[]>(
    initialMessages.map((message) => ({
      id: message.id,
      role: mapRole(message.role),
      content: message.content,
    }))
  );

  const [input, setInput] = useState("");
  const { selectedModel, setSelectedModel } = useChatPreferences();
  const [credits, setCredits] = useState(initialCredits);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const hasCredits = credits > 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }, [input]);

  async function refreshCredits() {
    const res = await fetch("/api/me");
    const data = await res.json();

    if (res.ok && data.user) {
      setCredits(data.user.credits);
    }
  }

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    const cleanInput = input.trim();

    if (!cleanInput || streaming || !hasCredits) return;

    setError("");
    setInput("");

    const userMessage: UiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: cleanInput,
    };

    const assistantMessage: UiMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
    };

    setMessages((current) => [...current, userMessage, assistantMessage]);
    setStreaming(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId,
          message: cleanInput,
          model: selectedModel,
        }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to send message");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      let pendingChunk = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        pendingChunk += decoder.decode(value, { stream: true });
        const events = pendingChunk.split("\n\n");
        pendingChunk = events.pop() ?? "";

        const textChunk = extractTextFromStreamChunk(events.join("\n"));

        if (textChunk) {
          assistantText += textChunk;

          setMessages((current) =>
            current.map((msg) =>
              msg.id === assistantMessage.id
                ? {
                    ...msg,
                    content: assistantText,
                  }
                : msg
            )
          );
        }
      }

      const finalTextChunk = extractTextFromStreamChunk(pendingChunk);

      if (finalTextChunk) {
        assistantText += finalTextChunk;

        setMessages((current) =>
          current.map((msg) =>
            msg.id === assistantMessage.id
              ? {
                  ...msg,
                  content: assistantText,
                }
              : msg
          )
        );
      }

      await refreshCredits();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");

      setMessages((current) =>
        current.filter((msg) => msg.id !== assistantMessage.id)
      );
    } finally {
      setStreaming(false);
    }
  }

  function applyPrompt(prompt: string) {
    if (!streaming) {
      setInput(prompt);
      textareaRef.current?.focus();
    }
  }

  function retryFromMessage(messageIndex: number) {
    if (streaming) return;

    const previousUserMessage = messages
      .slice(0, messageIndex)
      .reverse()
      .find((message) => message.role === "user");

    if (!previousUserMessage) return;

    setInput(previousUserMessage.content);
    textareaRef.current?.focus();
  }

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-30 flex min-w-0 flex-col overflow-hidden bg-slate-950 lg:static lg:z-auto lg:h-screen lg:flex-1">
      <div className="border-b border-white/10 bg-slate-950/95 px-3 py-2.5 backdrop-blur sm:px-6 sm:py-3">
        <div className="flex items-center gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300 sm:h-9 sm:w-9">
              <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>

            <div className="min-w-0">
              <h1 className="max-w-[11rem] truncate text-sm font-black tracking-tight text-white sm:max-w-none sm:text-lg">
                {conversationTitle}
              </h1>

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <ModeBadge mode={conversationMode} />

                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-slate-300">
                  <Wallet className="h-3.5 w-3.5 text-emerald-300" />
                  {credits.toLocaleString()} credits
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!hasCredits ? (
        <div className="border-b border-red-400/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
          You are out of credits. Billing and top-up are available from the
          billing page.
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6 sm:py-6">
        {messages.length === 0 ? (
          <div className="mx-auto flex min-h-full max-w-3xl items-center justify-center pb-20 text-center sm:pb-24">
            <div>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-3xl bg-cyan-400/10 text-cyan-300 sm:h-16 sm:w-16">
                <Sparkles className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <h2 className="mt-5 text-2xl font-black tracking-tight text-white sm:mt-6 sm:text-5xl">
                Start with a sharp question.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
                Nexus keeps the conversation saved, renders markdown cleanly and
                stays aware of the selected mode and model.
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => applyPrompt(prompt)}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-5 pb-24 pt-2 sm:space-y-8 sm:pb-28 sm:pt-4">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={
                  message.role === "user"
                    ? "flex justify-end"
                    : "flex flex-col items-start"
                }
              >
                <div
                  className={
                    message.role === "user"
                      ? "max-w-[86%] rounded-[1.25rem] bg-white px-4 py-3 text-sm leading-7 text-slate-950 shadow-lg shadow-black/10 sm:max-w-[70%] sm:rounded-[1.35rem] sm:px-5 sm:py-4"
                      : "max-w-[92%] rounded-[1.25rem] bg-[#262626] px-4 py-3 text-sm leading-7 text-slate-100 sm:max-w-[78%] sm:rounded-[1.35rem] sm:px-5 sm:py-4"
                  }
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] opacity-70">
                      {message.role === "user" ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-cyan-300" />
                      )}
                      {message.role === "user" ? "You" : "Nexus AI"}
                    </div>

                    {message.role === "user" && message.content ? (
                      <CopyButton text={message.content} />
                    ) : null}
                  </div>

                  {message.role === "assistant" ? (
                    <MessageContent content={message.content || "Thinking..."} />
                  ) : (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  )}
                </div>

                {message.role === "assistant" && message.content ? (
                  <ResponseActions
                    text={message.content}
                    onRetry={() => retryFromMessage(index)}
                  />
                ) : null}
              </div>
            ))}
          </div>
        )}

        {streaming ? (
          <div className="mx-auto mt-5 flex max-w-4xl items-center gap-2 text-sm font-bold text-cyan-200">
            <Loader2 className="h-4 w-4 animate-spin" />
            Nexus is thinking
          </div>
        ) : null}

        {error ? (
          <div className="mx-auto mt-5 max-w-4xl rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-white/10 bg-slate-950/95 px-2.5 pb-3 pt-2 backdrop-blur-xl sm:px-5 sm:pb-4"
      >
        <div className="mx-auto max-w-3xl rounded-[1.35rem] bg-[#242424] p-2 shadow-2xl shadow-black/30 ring-1 ring-white/10 sm:rounded-[1.5rem]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="relative w-fit shrink-0">
              <select
                value={selectedModel}
                onChange={(event) =>
                  setSelectedModel(event.target.value as AiModelId)
                }
                disabled={streaming}
                aria-label="Choose assistant model"
                className="h-8 appearance-none rounded-xl border border-white/10 bg-white/[0.06] pl-3 pr-8 text-[11px] font-black text-white outline-none transition hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-60 sm:h-11 sm:rounded-2xl sm:pl-3.5 sm:pr-9 sm:text-xs"
              >
                {aiModels.map((model) => (
                  <option key={model.id} value={model.id} className="bg-[#242424]">
                    {model.name}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 sm:text-xs">
                v
              </span>
            </div>

            <div className="flex min-w-0 flex-1 items-end gap-2">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSubmit();
                  }
                }}
                placeholder={
                  hasCredits
                    ? "Ask, plan, debug, draft or explore..."
                    : "You are out of credits..."
                }
                disabled={streaming || !hasCredits}
                className="max-h-36 min-h-10 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm leading-6 text-white outline-none placeholder:text-slate-500 disabled:opacity-60 sm:max-h-44 sm:min-h-11 sm:py-3"
              />

              <button
                type="submit"
                disabled={streaming || !input.trim() || !hasCredits}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500 sm:h-11 sm:w-11"
                aria-label="Send message"
              >
                <ArrowUp className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
