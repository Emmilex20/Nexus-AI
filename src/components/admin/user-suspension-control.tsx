"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  userId: string;
  isSuspended: boolean;
  reason?: string | null;
};

export function UserSuspensionControl({
  userId,
  isSuspended,
  reason,
}: Props) {
  const router = useRouter();
  const [suspensionReason, setSuspensionReason] = useState(reason ?? "");
  const [loading, setLoading] = useState(false);

  async function updateSuspension(suspend: boolean) {
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${userId}/suspension`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suspend,
          reason: suspensionReason || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update suspension");
      }

      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[2rem] border border-red-400/20 bg-red-500/10 p-6">
      <h2 className="text-xl font-black text-white">Account suspension</h2>
      <p className="mt-2 text-sm leading-6 text-red-100">
        Suspend users who abuse the platform, violate policies, or trigger
        payment/security risks.
      </p>

      <textarea
        value={suspensionReason}
        onChange={(e) => setSuspensionReason(e.target.value)}
        placeholder="Suspension reason"
        rows={4}
        className="mt-5 w-full resize-none rounded-2xl border border-red-400/20 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => updateSuspension(true)}
          disabled={loading || isSuspended}
          className="rounded-full bg-red-500 px-5 py-3 text-sm font-black text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Suspend user
        </button>

        <button
          type="button"
          onClick={() => updateSuspension(false)}
          disabled={loading || !isSuspended}
          className="rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Unsuspend user
        </button>
      </div>
    </div>
  );
}
