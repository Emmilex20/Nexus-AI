import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { MobileAppHeader } from "@/components/dashboard/mobile-app-header";
import { SuspendedNotice } from "@/components/dashboard/suspended-notice";
import { getCurrentDbUser } from "@/lib/current-user";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentDbUser();

  if (user?.isSuspended) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <SuspendedNotice reason={user.suspensionReason} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <AppSidebar />
      <div className="lg:pl-72">
        <MobileAppHeader />
        <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
