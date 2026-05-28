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
    <div className="max-w-none text-[15px] leading-8 text-slate-100 sm:text-base sm:leading-8">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-5 mt-10 text-3xl font-black tracking-tight text-white first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-4 mt-10 text-2xl font-black tracking-tight text-white first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-3 mt-8 text-xl font-black tracking-tight text-white first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="mb-3 mt-7 text-lg font-black text-white first:mt-0">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="my-4 text-pretty leading-8 text-slate-100 first:mt-0 last:mb-0">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="my-5 list-disc space-y-2 pl-6 marker:text-slate-400">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-5 list-decimal space-y-2 pl-6 marker:font-bold marker:text-slate-300">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="pl-1 leading-8 text-slate-100">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-black text-white">{children}</strong>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-cyan-200 underline decoration-cyan-200/40 underline-offset-4 transition hover:text-cyan-100"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-6 border-l-2 border-cyan-300/70 pl-4 text-slate-300">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-8 border-white/10" />,
          table: ({ children }) => (
            <div className="my-7 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-white/[0.04] text-slate-200">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border-b border-white/10 px-4 py-3 font-black">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-white/10 px-4 py-3 text-slate-200">
              {children}
            </td>
          ),
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
