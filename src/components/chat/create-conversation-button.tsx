"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import { MessageSquarePlus } from "lucide-react";

type CreateConversationButtonProps = {
  title?: string;
  mode?: "CHAT" | "SEARCH" | "CODE" | "FILE";
  intent?: "chat" | "image";
  projectId?: string;
  label?: string;
  className?: string;
  onCreated?: (conversationId: string) => void;
  children?: ReactNode;
};

export function CreateConversationButton({
  title = "New conversation",
  mode = "CHAT",
  intent = "chat",
  projectId,
  label = "New chat",
  className,
  onCreated,
  children,
}: CreateConversationButtonProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  async function createConversation() {
    setLoading(true);

    const fallbackProjectId = searchParams.get("projectId");

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          mode,
          projectId: projectId || fallbackProjectId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create conversation");
      }

      const conversationId = data.conversation.id as string;
      const intentParam = intent === "image" ? "&intent=image" : "";

      router.push(`/chat?conversationId=${conversationId}${intentParam}`);
      onCreated?.(conversationId);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to create conversation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={createConversation}
      disabled={loading}
      className={
        className ??
        "inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-black text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {children ? (
        loading ? (
          "Creating..."
        ) : (
          children
        )
      ) : (
        <>
          <MessageSquarePlus className="h-5 w-5" />
          {loading ? "Creating..." : label}
        </>
      )}
    </button>
  );
}
