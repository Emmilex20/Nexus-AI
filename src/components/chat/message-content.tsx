"use client";

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

            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageSrc}
                alt={alt ?? "Generated image"}
                loading="lazy"
                className="mt-4 max-h-[520px] w-full rounded-2xl border border-white/10 object-contain shadow-2xl shadow-black/30"
              />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
