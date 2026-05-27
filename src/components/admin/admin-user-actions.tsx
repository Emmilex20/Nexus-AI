"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AdminUserActionsProps = {
  userId: string;
  currentPlan: "FREE" | "PRO" | "BUILDER" | "TEAM";
};

export function AdminUserActions({
  userId,
  currentPlan,
}: AdminUserActionsProps) {
  const router = useRouter();
  const [creditAmount, setCreditAmount] = useState(100);
  const [plan, setPlan] = useState(currentPlan);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function adjustCredits() {
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${userId}/credits`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(creditAmount),
          note: note || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to adjust credits");

      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function updatePlan() {
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${userId}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          note: note || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to update plan");

      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
        <h2 className="text-xl font-black text-white">Adjust credits</h2>

        <div className="mt-5 space-y-4">
          <input
            type="number"
            value={creditAmount}
            onChange={(e) => setCreditAmount(Number(e.target.value))}
            className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
          />

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Admin note"
            className="w-full resize-none rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
          />

          <button
            type="button"
            onClick={adjustCredits}
            disabled={loading}
            className="w-full rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-60"
          >
            Apply credit change
          </button>
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
        <h2 className="text-xl font-black text-white">Override plan</h2>

        <div className="mt-5 space-y-4">
          <select
            value={plan}
            onChange={(e) =>
              setPlan(e.target.value as "FREE" | "PRO" | "BUILDER" | "TEAM")
            }
            className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
          >
            <option value="FREE">FREE</option>
            <option value="PRO">PRO</option>
            <option value="BUILDER">BUILDER</option>
            <option value="TEAM">TEAM</option>
          </select>

          <button
            type="button"
            onClick={updatePlan}
            disabled={loading}
            className="w-full rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-60"
          >
            Update plan
          </button>
        </div>
      </div>
    </div>
  );
}
