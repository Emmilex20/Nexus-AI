import type { Metadata } from "next";
import { Suspense } from "react";
import { ChatPreferencesProvider } from "@/components/chat/chat-preferences";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { MobileAppHeader } from "@/components/dashboard/mobile-app-header";
import { SuspendedNotice } from "@/components/dashboard/suspended-notice";
import { webConversationWhere } from "@/lib/conversation-filters";
import { getCurrentDbUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

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

  const recentConversations = user
    ? await prisma.conversation.findMany({
        where: webConversationWhere({
          userId: user.id,
          archived: false,
        }),
        orderBy: {
          updatedAt: "desc",
        },
        take: 8,
      })
    : [];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <ChatPreferencesProvider>
        <Suspense fallback={null}>
          <AppSidebar
            conversations={recentConversations.map((conversation) => ({
              id: conversation.id,
              title: conversation.title,
              mode: conversation.mode,
              updatedAt: conversation.updatedAt.toISOString(),
            }))}
          />
        </Suspense>
        <div className="lg:pl-60">
          <MobileAppHeader
            conversations={recentConversations.map((conversation) => ({
              id: conversation.id,
              title: conversation.title,
              mode: conversation.mode,
              updatedAt: conversation.updatedAt.toISOString(),
            }))}
          />
          <main className="min-h-screen px-4 py-6 sm:px-5 lg:px-5 lg:py-5">
            {children}
          </main>
        </div>
      </ChatPreferencesProvider>
    </div>
  );
}
