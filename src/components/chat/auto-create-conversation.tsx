"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { ChatMode } from "@/config/ai-models";

type AutoCreateConversationProps = {
  title: string;
  mode?: ChatMode;
  projectId?: string;
  intent?: string;
};

export function AutoCreateConversation({
  title,
  mode = "CHAT",
  projectId,
  intent,
}: AutoCreateConversationProps) {
  const router = useRouter();
  const startedRef = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;

    async function createConversation() {
      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title,
            mode,
            projectId,
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to create conversation");
        }

        const conversationId = data.conversation.id as string;
        const intentParam = intent === "image" ? "&intent=image" : "";

        router.replace(`/chat?conversationId=${conversationId}${intentParam}`);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create conversation"
        );
      }
    }

    void createConversation();
  }, [intent, mode, projectId, router, title]);

  return (
    <div className="-mx-4 -my-6 flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 sm:-mx-5 lg:-m-5 lg:min-h-screen">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
        <p className="mt-4 text-sm font-bold text-white">
          Opening Nexus AI...
        </p>
        {error ? (
          <p className="mt-3 max-w-sm text-sm leading-6 text-red-300">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
