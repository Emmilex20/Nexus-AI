import type { BillingEvent } from "@prisma/client";
import { formatDate } from "@/lib/format";

type BillingEventsTableProps = {
  events: BillingEvent[];
};

export function BillingEventsTable({ events }: BillingEventsTableProps) {
  return (
    <section className="rounded-4xl border border-white/10 bg-white/4 p-6">
      <h2 className="text-2xl font-black text-white">Billing events</h2>
      <p className="mt-2 text-sm text-slate-400">
        Track important billing changes, credit grants and payment outcomes.
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-170 text-left text-sm">
          <thead className="text-slate-500">
            <tr className="border-b border-white/10">
              <th className="py-3 pr-4 font-semibold">Event</th>
              <th className="py-3 pr-4 font-semibold">Note</th>
              <th className="py-3 pr-4 font-semibold">Date</th>
            </tr>
          </thead>

          <tbody>
            {events.length > 0 ? (
              events.map((event) => (
                <tr
                  key={event.id}
                  className="border-b border-white/5 text-slate-300"
                >
                  <td className="py-4 pr-4">{event.type}</td>
                  <td className="py-4 pr-4">{event.note ?? "—"}</td>
                  <td className="py-4 pr-4">{formatDate(event.createdAt)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="py-8 text-center text-slate-500">
                  No billing events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
