"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";

type DeleteMemoryButtonProps = {
  memoryId: string;
};

export function DeleteMemoryButton({ memoryId }: DeleteMemoryButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function deleteMemory() {
    const confirmed = window.confirm("Forget this memory?");

    if (!confirmed) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/memory/${memoryId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete memory");
      }

      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete memory");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={deleteMemory}
      disabled={loading}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
      aria-label="Delete memory"
      title="Delete memory"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

