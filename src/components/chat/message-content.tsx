"use client";

import type { ReactNode } from "react";
import { isValidElement, useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MessageContentProps = {
  content: string;
};

export function MessageContent({ content }: MessageContentProps) {
  return (
    <div className="prose prose-invert max-w-none text-[15px] leading-8 text-slate-100 prose-headings:mb-4 prose-headings:mt-9 prose-headings:font-black prose-headings:tracking-tight prose-p:my-4 prose-p:leading-8 prose-a:text-cyan-200 prose-a:underline prose-a:decoration-cyan-200/40 prose-a:underline-offset-4 prose-strong:text-white prose-ul:my-5 prose-ol:my-5 prose-li:my-2 prose-li:pl-1 prose-blockquote:border-l-cyan-300 prose-blockquote:text-slate-300 prose-hr:border-white/10 prose-table:text-sm prose-th:border-b prose-th:border-white/15 prose-th:pb-3 prose-th:text-left prose-td:border-b prose-td:border-white/10 prose-td:py-3 prose-code:font-mono prose-code:text-cyan-100 prose-pre:m-0 prose-pre:bg-transparent prose-pre:p-0 sm:text-base sm:leading-8">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children }) => {
            const code = getTextFromNode(children).replace(/\n$/, "");
            const language = getLanguageFromCodeNode(children);

            return <CodeBlock code={code} language={language} />;
          },
          code: ({ className, children, ...props }) => {
            return (
              <code
                className={[
                  "rounded-md bg-white/[0.08] px-1.5 py-0.5 text-[0.92em] text-cyan-100",
                  className,
                ]
                  .filter(Boolean)
                  .join(" ")}
                {...props}
              >
                {children}
              </code>
            );
          },
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

function CodeBlock({
  code,
  language,
}: {
  code: string;
  language?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="my-6 overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#272727] shadow-2xl shadow-black/20">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <span className="text-xs font-black text-slate-300">
          {language ? languageLabel(language) : "Plain text"}
        </span>
        <button
          type="button"
          onClick={copyCode}
          className="inline-flex h-8 items-center gap-2 rounded-full px-2.5 text-xs font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="m-0 overflow-x-auto p-4 text-sm leading-7 text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function getTextFromNode(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(getTextFromNode).join("");
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return getTextFromNode(node.props.children);
  }

  return "";
}

function getLanguageFromCodeNode(node: ReactNode): string | undefined {
  if (Array.isArray(node)) {
    return node.map(getLanguageFromCodeNode).find(Boolean);
  }

  if (!isValidElement<{ className?: string }>(node)) {
    return undefined;
  }

  const className = node.props.className ?? "";
  const match = /language-([\w-]+)/.exec(className);

  return match?.[1];
}

function languageLabel(language: string) {
  if (language.length <= 4) {
    return language.toUpperCase();
  }

  return `${language.slice(0, 1).toUpperCase()}${language.slice(1)}`;
}
