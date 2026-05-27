import Link from "next/link";
import { ShieldAlert } from "lucide-react";

type SuspendedNoticeProps = {
  reason?: string | null;
};

export function SuspendedNotice({ reason }: SuspendedNoticeProps) {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-[2rem] border border-red-400/20 bg-red-500/10 p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-500/15 text-red-300">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <h1 className="mt-6 text-3xl font-black text-white">
          Account suspended
        </h1>

        <p className="mt-3 text-sm leading-7 text-red-100">
          Your account access has been limited.
          {reason ? ` Reason: ${reason}` : ""}
        </p>

        <Link
          href="/contact"
          className="mt-8 inline-flex rounded-full bg-white px-6 py-3 text-sm font-black text-slate-950"
        >
          Contact support
        </Link>
      </div>
    </div>
  );
}
