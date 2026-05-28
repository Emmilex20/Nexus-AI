"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent, PointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Archive, MessageSquare, MoreHorizontal, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type RecentConversation = {
  id: string;
  title: string;
  mode: string;
  updatedAt: string;
};

type RecentChatItemProps = {
  conversation: RecentConversation;
  active?: boolean;
  onNavigate?: () => void;
};

export function RecentChatItem({
  conversation,
  active = false,
  onNavigate,
}: RecentChatItemProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const itemRef = useRef<HTMLDivElement | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: globalThis.PointerEvent) {
      if (!itemRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  function clearLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function openMenu(event?: MouseEvent<HTMLButtonElement>) {
    event?.preventDefault();
    event?.stopPropagation();
    setOpen((value) => !value);
  }

  function handlePointerDown(event: PointerEvent<HTMLAnchorElement>) {
    if (event.pointerType !== "touch") return;

    clearLongPress();
    longPressTriggered.current = false;

    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setOpen(true);
    }, 520);
  }

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (longPressTriggered.current) {
      event.preventDefault();
      longPressTriggered.current = false;
      return;
    }

    onNavigate?.();
  }

  function handleContextMenu(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    setOpen(true);
  }

  function isCurrentConversation() {
    if (active) return true;
    if (typeof window === "undefined") return false;

    return (
      new URL(window.location.href).searchParams.get("conversationId") ===
      conversation.id
    );
  }

  async function archiveConversation() {
    setLoading(true);

    try {
      await fetch(`/api/conversations/${conversation.id}/archive`, {
        method: "PATCH",
      });

      setOpen(false);

      if (isCurrentConversation()) {
        router.push("/history");
      }

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
      await fetch(`/api/conversations/${conversation.id}/delete`, {
        method: "DELETE",
      });

      setOpen(false);

      if (isCurrentConversation()) {
        router.push("/history");
      }

      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={itemRef} className="group relative">
      <Link
        href={`/chat?conversationId=${conversation.id}`}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onPointerDown={handlePointerDown}
        onPointerUp={clearLongPress}
        onPointerCancel={clearLongPress}
        onPointerLeave={clearLongPress}
        className={cn(
          "block rounded-xl border p-2.5 pr-9 transition",
          active
            ? "border-cyan-300/30 bg-cyan-400/10 text-white"
            : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.05] hover:text-white"
        )}
      >
        <div className="flex gap-2.5">
          <div
            className={cn(
              "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
              active
                ? "bg-cyan-400/15 text-cyan-200"
                : "bg-white/5 text-slate-500"
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-black">{conversation.title}</p>
            <p
              className={cn(
                "mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.08em]",
                active ? "text-cyan-100/70" : "text-slate-600"
              )}
            >
              {conversation.mode} -{" "}
              {new Date(conversation.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={openMenu}
        disabled={loading}
        className={cn(
          "absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 opacity-100 transition hover:bg-white/10 hover:text-white disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100",
          open && "bg-white/10 text-white opacity-100"
        )}
        aria-label="Conversation actions"
        title="Conversation actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open ? (
        <div className="absolute right-2 top-10 z-50 w-36 rounded-2xl border border-white/10 bg-[#101521] p-1.5 shadow-2xl shadow-black/40">
          <button
            type="button"
            onClick={archiveConversation}
            disabled={loading}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-black text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
          >
            <Archive className="h-3.5 w-3.5" />
            Archive
          </button>

          <button
            type="button"
            onClick={deleteConversation}
            disabled={loading}
            className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-black text-red-200 transition hover:bg-red-500/15 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}
