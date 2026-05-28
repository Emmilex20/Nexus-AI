"use client";

import { Check, Copy, RotateCcw, Share2, ThumbsDown, ThumbsUp } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type ResponseActionsProps = {
  text: string;
  onRetry: () => void;
};

type Feedback = "like" | "dislike" | null;

export function ResponseActions({ text, onRetry }: ResponseActionsProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

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

      <ActionButton label="Try again" onClick={onRetry}>
        <RotateCcw className="h-4 w-4" />
      </ActionButton>
    </div>
  );
}

function ActionButton({
  label,
  active = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void | Promise<void>;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-white/10 hover:text-white",
        active ? "bg-white/10 text-cyan-200" : "text-slate-400"
      )}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}
