import Link from "next/link";
import { Prisma } from "@prisma/client";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    plan?: string;
    status?: string;
    page?: string;
  }>;
};

const pageSize = 20;

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const page = Math.max(1, Number(params.page ?? 1));
  const q = params.q?.trim() ?? "";
  const plan = params.plan ?? "ALL";
  const status = params.status ?? "ALL";

  const where: Prisma.UserWhereInput = {
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(plan !== "ALL" ? { plan: plan as Prisma.EnumPlanFilter["equals"] } : {}),
    ...(status === "SUSPENDED"
      ? { isSuspended: true }
      : status === "ACTIVE"
        ? { isSuspended: false }
        : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: {
          select: {
            conversations: true,
            projects: true,
            payments: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function buildHref(nextPage: number) {
    const query = new URLSearchParams();

    if (q) query.set("q", q);
    if (plan !== "ALL") query.set("plan", plan);
    if (status !== "ALL") query.set("status", status);

    query.set("page", String(nextPage));

    return `/admin/users?${query.toString()}`;
  }

  return (
    <div>
      <AdminPageHeader
        title="Users"
        description="Search, filter and monitor users safely."
      />

      <form className="mb-6 grid gap-3 rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 lg:grid-cols-[1fr_180px_180px_120px]">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search email or name"
          className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
        />

        <select
          name="plan"
          defaultValue={plan}
          className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
        >
          <option value="ALL">All plans</option>
          <option value="FREE">Free</option>
          <option value="PRO">Pro</option>
          <option value="BUILDER">Builder</option>
          <option value="TEAM">Team</option>
        </select>

        <select
          name="status"
          defaultValue={status}
          className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
        >
          <option value="ALL">All status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </select>

        <button className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">
          Filter
        </button>
      </form>

      <div className="overflow-x-auto rounded-[2rem] border border-white/10 bg-white/[0.04] p-4">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="text-slate-500">
            <tr className="border-b border-white/10">
              <th className="py-3 pr-4">User</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3 pr-4">Role</th>
              <th className="py-3 pr-4">Plan</th>
              <th className="py-3 pr-4">Credits</th>
              <th className="py-3 pr-4">Projects</th>
              <th className="py-3 pr-4">Chats</th>
              <th className="py-3 pr-4">Payments</th>
              <th className="py-3 pr-4">Joined</th>
            </tr>
          </thead>

          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b border-white/5 text-slate-300"
              >
                <td className="py-4 pr-4">
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="font-bold text-white transition hover:text-violet-300"
                  >
                    {user.firstName || user.lastName
                      ? `${user.firstName ?? ""} ${user.lastName ?? ""}`
                      : "Unnamed user"}
                  </Link>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </td>
                <td className="py-4 pr-4">
                  <span
                    className={
                      user.isSuspended
                        ? "rounded-full bg-red-500/15 px-3 py-1 text-xs font-black text-red-300"
                        : "rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black text-emerald-300"
                    }
                  >
                    {user.isSuspended ? "Suspended" : "Active"}
                  </span>
                </td>
                <td className="py-4 pr-4">{user.role}</td>
                <td className="py-4 pr-4">{user.plan}</td>
                <td className="py-4 pr-4">{user.credits}</td>
                <td className="py-4 pr-4">{user._count.projects}</td>
                <td className="py-4 pr-4">{user._count.conversations}</td>
                <td className="py-4 pr-4">{user._count.payments}</td>
                <td className="py-4 pr-4">{formatDate(user.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          Page {page} of {totalPages} • {total} users
        </p>

        <div className="flex gap-3">
          <Link
            href={buildHref(Math.max(1, page - 1))}
            className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-white/5"
          >
            Previous
          </Link>

          <Link
            href={buildHref(Math.min(totalPages, page + 1))}
            className="rounded-full bg-white px-5 py-2.5 text-sm font-black text-slate-950 transition hover:bg-slate-200"
          >
            Next
          </Link>
        </div>
      </div>
    </div>
  );
}
