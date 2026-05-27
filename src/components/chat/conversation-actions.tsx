"use client";

import { useRouter } from "next/navigation";
import { Archive, Trash2 } from "lucide-react";
import { useState } from "react";

type ConversationActionsProps = {
  conversationId: string;
};

export function ConversationActions({ conversationId }: ConversationActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function archiveConversation() {
    setLoading(true);

    try {
      await fetch(`/api/conversations/${conversationId}/archive`, {
        method: "PATCH",
      });

      router.push("/history");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function deleteConversation() {
    const confirmed = window.confirm(
      "Delete this conversation permanently? This cannot be undone."
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      await fetch(`/api/conversations/${conversationId}/delete`, {
        method: "DELETE",
      });

      router.push("/history");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={archiveConversation}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-60"
      >
        <Archive className="h-4 w-4" />
        Archive
      </button>

      <button
        type="button"
        onClick={deleteConversation}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </button>
    </div>
  );
}
