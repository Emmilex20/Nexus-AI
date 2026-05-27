"use client";

import { useEffect, useRef, useState } from "react";
import { SendHorizonal, Sparkles, User, Wallet } from "lucide-react";
import { MessageContent } from "@/components/chat/message-content";
import { CopyButton } from "@/components/chat/copy-button";
import { ConversationActions } from "@/components/chat/conversation-actions";
import { ModelSelector } from "@/components/chat/model-selector";
import { ModeBadge } from "@/components/chat/mode-badge";
import type { AiModelId, ChatMode } from "@/config/ai-models";

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
  const [selectedModel, setSelectedModel] = useState<AiModelId>("gpt-4o-mini");
  const [credits, setCredits] = useState(initialCredits);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const hasCredits = credits > 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function refreshCredits() {
    const res = await fetch("/api/me");
    const data = await res.json();

    if (res.ok && data.user) {
      setCredits(data.user.credits);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

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

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-1 flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03]">
      <div className="border-b border-white/10 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
              <Sparkles className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-black text-white">
                {conversationTitle}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <ModeBadge mode={conversationMode} />

                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300">
                  <Wallet className="h-3.5 w-3.5" />
                  {credits} credits
                </span>
              </div>
            </div>
          </div>

          <ConversationActions conversationId={conversationId} />
        </div>

        <div className="mt-5">
          <ModelSelector
            value={selectedModel}
            onChange={setSelectedModel}
            disabled={streaming}
          />
        </div>
      </div>

      {!hasCredits ? (
        <div className="border-b border-red-400/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
          You are out of credits. Billing and top-up will be connected in a later
          batch.
        </div>
      ) : null}

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-6">
        {messages.length === 0 ? (
          <div className="flex min-h-[35vh] items-center justify-center text-center">
            <div>
              <h2 className="text-3xl font-black text-white sm:text-5xl">
                Start the conversation.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-400">
                Ask Nexus AI anything about coding, research, business, learning,
                planning or productivity.
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={
                message.role === "user" ? "flex justify-end" : "flex justify-start"
              }
            >
              <div
                className={
                  message.role === "user"
                    ? "max-w-[90%] rounded-[1.5rem] bg-white px-5 py-4 text-sm leading-7 text-slate-950 sm:max-w-[75%]"
                    : "max-w-[90%] rounded-[1.5rem] border border-white/10 bg-slate-900/80 px-5 py-4 text-sm leading-7 text-slate-100 sm:max-w-[80%]"
                }
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] opacity-60">
                    {message.role === "user" ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {message.role === "user" ? "You" : "Nexus AI"}
                  </div>

                  {message.content ? <CopyButton text={message.content} /> : null}
                </div>

                {message.role === "assistant" ? (
                  <MessageContent content={message.content || "Thinking..."} />
                ) : (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                )}
              </div>
            </div>
          ))
        )}

        {error ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-white/10 bg-slate-950/80 px-3 py-3 backdrop-blur-xl sm:px-5 sm:py-4"
      >
        <div className="mx-auto flex max-w-3xl items-end gap-3 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-3">
          <textarea
            rows={1}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={
              hasCredits ? "Message Nexus AI..." : "You are out of credits..."
            }
            disabled={streaming || !hasCredits}
            className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={streaming || !input.trim() || !hasCredits}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500 text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Send message"
          >
            <SendHorizonal className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
