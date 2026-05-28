import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Calendar,
  Download,
  Image as ImageIcon,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { CreateConversationButton } from "@/components/chat/create-conversation-button";
import { PageHeader } from "@/components/dashboard/page-header";
import { getCurrentDbUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export default async function MediaPage() {
  const user = await getCurrentDbUser();

  if (!user) {
    redirect("/sign-in");
  }

  const images = await prisma.generatedImage.findMany({
    where: {
      userId: user.id,
    },
    include: {
      conversation: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 120,
  });

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          eyebrow="Media"
          title="Generated images."
          description="Every image created by Nexus AI is saved here automatically for download and reuse."
        />

        <CreateConversationButton
          title="Image generation"
          intent="image"
          label="Create image"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Sparkles className="h-5 w-5" />
          Create image
        </CreateConversationButton>
      </div>

      {images.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {images.map((image) => {
            const imageUrl = `/api/generated-images/${image.id}`;
            const downloadUrl = `${imageUrl}?download=1`;

            return (
              <article
                key={image.id}
                className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.04]"
              >
                <div className="group relative aspect-square bg-black/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={image.prompt}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                    loading="lazy"
                  />

                  <div className="absolute right-3 top-3 flex gap-2">
                    <a
                      href={downloadUrl}
                      download
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-black"
                      aria-label="Download generated image"
                      title="Download image"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <p className="line-clamp-3 text-sm leading-6 text-slate-200">
                    {image.prompt}
                  </p>

                  <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    <span>{image.model}</span>
                    <span>{image.size}</span>
                    <span>{image.quality}</span>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Calendar className="h-4 w-4" />
                      {image.createdAt.toLocaleDateString()}
                    </div>

                    <Link
                      href={`/chat?conversationId=${image.conversation.id}`}
                      className="inline-flex items-center gap-2 text-xs font-black text-cyan-200 transition hover:text-cyan-100"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Open chat
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-fuchsia-500/15 text-fuchsia-300">
            <ImageIcon className="h-8 w-8" />
          </div>

          <h2 className="mt-6 text-2xl font-black text-white">
            No generated images yet
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-400">
            Create your first image from the sidebar or from chat. It will be
            saved here automatically.
          </p>

          <div className="mt-8">
            <CreateConversationButton
              title="Image generation"
              intent="image"
              label="Create first image"
            />
          </div>
        </div>
      )}
    </div>
  );
}
