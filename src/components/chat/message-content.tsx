"use client";

import { Download } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MessageContentProps = {
  content: string;
};

export function MessageContent({ content }: MessageContentProps) {
  return (
    <div className="prose prose-invert max-w-none prose-p:leading-7 prose-pre:rounded-2xl prose-pre:border prose-pre:border-white/10 prose-pre:bg-slate-950 prose-code:text-violet-200">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ alt, src }) => {
            const imageSrc = typeof src === "string" ? src : "";
            const downloadHref = imageSrc.startsWith("/api/generated-images/")
              ? `${imageSrc}?download=1`
              : imageSrc;

            return (
              <span className="relative mt-4 block overflow-hidden rounded-2xl border border-white/10 bg-black/20 shadow-2xl shadow-black/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrc}
                  alt={alt ?? "Generated image"}
                  loading="lazy"
                  className="max-h-[520px] w-full object-contain"
                />
                <a
                  href={downloadHref}
                  download
                  className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-black"
                  aria-label="Download generated image"
                  title="Download image"
                >
                  <Download className="h-4 w-4" />
                </a>
              </span>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
