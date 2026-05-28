"use client";

import {
  ArrowUp,
  Check,
  Copy,
  Lightbulb,
  RotateCcw,
  Search,
  Share2,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type RetryMode = "TRY_AGAIN" | "THINK_LONGER" | "SEARCH" | "CUSTOM";

export type RetryRequest = {
  mode: RetryMode;
  instruction?: string;
};

type ResponseActionsProps = {
  text: string;
  onRetry: (request: RetryRequest) => void;
  disabled?: boolean;
};

type Feedback = "like" | "dislike" | null;

export function ResponseActions({
  text,
  onRetry,
  disabled = false,
}: ResponseActionsProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [retryOpen, setRetryOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const retryRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!retryOpen) return;

    function handlePointerDown(event: globalThis.PointerEvent) {
      if (!retryRef.current?.contains(event.target as Node)) {
        setRetryOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [retryOpen]);

  async function copyText() {
    await navigator.clipboard.writeText(text);
    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 1500);
  }

  async function shareText() {
    if (navigator.share) {
      await navigator.share({
        text,
      });
      return;
    }

    await copyText();
  }

  function toggleFeedback(nextFeedback: Exclude<Feedback, null>) {
    setFeedback((current) => (current === nextFeedback ? null : nextFeedback));
  }

  function submitRetry(request: RetryRequest) {
    setRetryOpen(false);
    setInstruction("");
    onRetry(request);
  }

  function submitCustomRetry() {
    const cleanInstruction = instruction.trim();

    if (!cleanInstruction) return;

    submitRetry({
      mode: "CUSTOM",
      instruction: cleanInstruction,
    });
  }

  return (
    <div className="mt-2 flex items-center gap-1.5 text-slate-400">
      <ActionButton
        label={copied ? "Copied" : "Copy response"}
        onClick={copyText}
        active={copied}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </ActionButton>

      <ActionButton
        label="Like response"
        onClick={() => toggleFeedback("like")}
        active={feedback === "like"}
      >
        <ThumbsUp className="h-4 w-4" />
      </ActionButton>

      <ActionButton
        label="Dislike response"
        onClick={() => toggleFeedback("dislike")}
        active={feedback === "dislike"}
      >
        <ThumbsDown className="h-4 w-4" />
      </ActionButton>

      <ActionButton label="Share response" onClick={shareText}>
        <Share2 className="h-4 w-4" />
      </ActionButton>

      <div ref={retryRef} className="relative">
        <ActionButton
          label="Try again"
          onClick={() => setRetryOpen((value) => !value)}
          active={retryOpen}
          disabled={disabled}
        >
          <RotateCcw className="h-4 w-4" />
        </ActionButton>

        {retryOpen ? (
          <div className="absolute bottom-10 left-0 z-50 w-72 max-w-[calc(100vw-2rem)] rounded-[1.25rem] border border-white/10 bg-[#2f2f2f] p-3 shadow-2xl shadow-black/50">
            <div className="flex items-center gap-2 rounded-2xl bg-white/[0.04] px-3 py-2">
              <input
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    submitCustomRetry();
                  }
                }}
                placeholder="Ask to change response"
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
                autoFocus
              />

              <button
                type="button"
                onClick={submitCustomRetry}
                disabled={!instruction.trim() || disabled}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-slate-300 transition hover:bg-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Apply change request"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>

            <div className="my-2 h-px bg-white/10" />

            <RetryOption
              icon={<RotateCcw className="h-4 w-4" />}
              label="Try again"
              onClick={() => submitRetry({ mode: "TRY_AGAIN" })}
              disabled={disabled}
            />
            <RetryOption
              icon={<Lightbulb className="h-4 w-4" />}
              label="Think longer"
              onClick={() => submitRetry({ mode: "THINK_LONGER" })}
              disabled={disabled}
            />
            <RetryOption
              icon={<Search className="h-4 w-4" />}
              label="Search the web"
              onClick={() => submitRetry({ mode: "SEARCH" })}
              disabled={disabled}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ActionButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void | Promise<void>;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={disabled}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40",
        active ? "bg-white/10 text-cyan-200" : "text-slate-400"
      )}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function RetryOption({
  icon,
  label,
  disabled = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span className="text-slate-200">{icon}</span>
      {label}
    </button>
  );
}
