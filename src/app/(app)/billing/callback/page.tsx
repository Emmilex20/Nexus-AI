import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { finalizePayment } from "@/lib/payment-finalize";

type BillingCallbackPageProps = {
  searchParams: Promise<{
    reference?: string | string[];
    trxref?: string | string[];
  }>;
};

function getSingleParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BillingCallbackPage({
  searchParams,
}: BillingCallbackPageProps) {
  const params = await searchParams;
  const reference = getSingleParam(params.reference) ?? getSingleParam(params.trxref);

  let success = false;
  let message = "No payment reference was provided.";

  if (reference) {
    try {
      const payment = await finalizePayment(reference);
      success = payment.status === "SUCCESS";
      message = success
        ? "Your payment was verified successfully."
        : `Payment status: ${payment.status}`;
    } catch (error) {
      message =
        error instanceof Error ? error.message : "Payment verification failed.";
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center">
        <div
          className={
            success
              ? "mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/15 text-emerald-300"
              : "mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-500/15 text-red-300"
          }
        >
          {success ? (
            <CheckCircle2 className="h-8 w-8" />
          ) : (
            <XCircle className="h-8 w-8" />
          )}
        </div>

        <h1 className="mt-6 text-3xl font-black text-white">
          {success ? "Payment successful" : "Payment not completed"}
        </h1>

        <p className="mt-3 text-sm leading-7 text-slate-400">{message}</p>

        <Link
          href="/billing"
          className="mt-8 inline-flex rounded-full bg-white px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-200"
        >
          Back to billing
        </Link>
      </div>
    </div>
  );
}
