import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { AutoCreateConversation } from "@/components/chat/auto-create-conversation";
import { ChatPanel } from "@/components/chat/chat-panel";

type ChatPageProps = {
  searchParams: Promise<{
    conversationId?: string;
    projectId?: string;
    intent?: string;
  }>;
};

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const user = await getCurrentDbUser();

  if (!user) {
    redirect("/sign-in");
  }

  const params = await searchParams;
  const conversationId = params.conversationId;
  const initialComposerMode = params.intent === "image" ? "IMAGE" : "DEFAULT";

  if (!conversationId) {
    const project = params.projectId
      ? await prisma.project.findFirst({
          where: {
            id: params.projectId,
            userId: user.id,
          },
          select: {
            id: true,
            name: true,
          },
        })
      : null;

    return (
      <AutoCreateConversation
        title={
          params.intent === "image"
            ? "Image generation"
            : project
              ? `${project.name} workspace`
              : "New conversation"
        }
        projectId={project?.id}
        intent={params.intent}
      />
    );
  }

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId: user.id,
      archived: false,
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!conversation) {
    redirect("/chat");
  }

  return (
    <div className="-mx-4 -my-6 sm:-mx-5 lg:-m-5">
      <ChatPanel
        key={conversation.id}
        conversationId={conversation.id}
        conversationTitle={conversation.title}
        conversationMode={conversation.mode}
        initialComposerMode={initialComposerMode}
        initialPlan={user.plan}
        initialCredits={user.credits}
        initialMessages={conversation.messages}
      />
    </div>
  );
}
