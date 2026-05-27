"use client";

import { useState } from "react";

type PaymentButtonProps =
  | {
      type: "PLAN";
      plan: "PRO" | "BUILDER" | "TEAM";
      label: string;
      disabled?: boolean;
    }
  | {
      type: "CREDITS";
      packageId: "starter" | "growth" | "power";
      label: string;
      disabled?: boolean;
    };

export function PaymentButton(props: PaymentButtonProps) {
  const [loading, setLoading] = useState(false);

  async function startPayment() {
    setLoading(true);

    try {
      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body:
          props.type === "PLAN"
            ? JSON.stringify({
                type: "PLAN",
                plan: props.plan,
              })
            : JSON.stringify({
                type: "CREDITS",
                packageId: props.packageId,
              }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unable to start payment");
      }

      window.location.href = data.authorizationUrl;
    } catch (error) {
      alert(error instanceof Error ? error.message : "Payment failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={startPayment}
      disabled={props.disabled || loading}
      className="mt-6 w-full rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500"
    >
      {loading ? "Redirecting..." : props.label}
    </button>
  );
}
