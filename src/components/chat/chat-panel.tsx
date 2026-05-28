"use client";

import type { Plan } from "@prisma/client";
import { useEffect, useRef, useState } from "react";
import type { ClipboardEvent, FormEvent, ReactNode } from "react";
import {
  ArrowUp,
  Bot,
  Brain,
  Check,
  ChevronDown,
  FileText,
  Globe,
  Image as ImageIcon,
  Loader2,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { MessageContent } from "@/components/chat/message-content";
import { CopyButton } from "@/components/chat/copy-button";
import {
  ResponseActions,
  type RetryRequest,
} from "@/components/chat/response-actions";
import { useChatPreferences } from "@/components/chat/chat-preferences";
import { aiModels, chatModes, type AiModelId } from "@/config/ai-models";
import type { ChatMode } from "@/config/ai-models";
import { imageGenerationConfig, planLimits } from "@/config/billing";
import { cn } from "@/lib/utils";

type DbMessage = {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  createdAt: string | Date;
};

type ChatPanelProps = {
  conversationId: string;
  conversationTitle: string;
  conversationMode: ChatMode;
  initialPlan: Plan;
  initialCredits: number;
  initialMessages: DbMessage[];
};

type UiMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: ComposerAttachment[];
};

type ComposerAttachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  kind: "image" | "text" | "file";
  dataUrl?: string;
  text?: string;
};

type ComposerMode =
  | "DEFAULT"
  | "THINKING"
  | "DEEP_RESEARCH"
  | "WEB_SEARCH"
  | "IMAGE";

type SiteSearchMode = "WEB" | "SPECIFIC";

type ImagePreview = {
  src: string;
  name: string;
};

const quickPrompts = [
  "Summarize the next steps",
  "Turn this into a checklist",
  "Give me the technical plan",
];

const readableTextExtensions = new Set([
  "txt",
  "md",
  "csv",
  "json",
  "js",
  "jsx",
  "ts",
  "tsx",
  "css",
  "html",
  "xml",
  "yaml",
  "yml",
  "log",
]);

const composerModeLabels: Record<ComposerMode, string> = {
  DEFAULT: "Standard",
  THINKING: "Thinking",
  DEEP_RESEARCH: "Deep research",
  WEB_SEARCH: "Web search",
  IMAGE: "Image",
};

function looksLikeImageGenerationPrompt(value: string) {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");

  if (!normalized) return false;

  const asksForPromptOnly =
    /^(please\s+)?(can you\s+|could you\s+|would you\s+)?(generate|create|make|write)\s+(me\s+)?(an?\s+)?(image\s+)?prompt\b/.test(
      normalized
    );

  if (asksForPromptOnly) return false;

  const imageNouns =
    /\b(image|picture|photo|illustration|artwork|poster|logo|icon|avatar|wallpaper|banner|thumbnail|cover art)\b/;
  const directImageCommand =
    /^(please\s+)?(can you\s+|could you\s+|would you\s+)?(generate|create|make|draw|paint|sketch|render|design|produce)\s+(me\s+)?(an?\s+|the\s+)?(image|picture|photo|illustration|artwork|poster|logo|icon|avatar|wallpaper|banner|thumbnail|cover art)\b/;
  const commandWithImageTarget =
    /^(please\s+)?(can you\s+|could you\s+|would you\s+)?(generate|create|make|draw|paint|sketch|render|design|produce)\b/.test(
      normalized
    ) && imageNouns.test(normalized);

  return directImageCommand.test(normalized) || commandWithImageTarget;
}

function mapRole(role: DbMessage["role"]): UiMessage["role"] {
  if (role === "USER") return "user";
  if (role === "ASSISTANT") return "assistant";
  return "system";
}

function extractTextFromStreamChunk(chunk: string) {
  let text = "";

  for (const rawLine of chunk.split("\n")) {
    const line = rawLine.trim();

    if (!line || line === "data: [DONE]") {
      continue;
    }

    if (line.startsWith("data:")) {
      try {
        const part = JSON.parse(line.slice(5).trim()) as {
          type?: string;
          delta?: string;
        };

        if (part.type === "text-delta" && part.delta) {
          text += part.delta;
        }
      } catch {
        continue;
      }
    }

    if (line.startsWith("0:")) {
      try {
        text += JSON.parse(line.slice(2));
      } catch {
        continue;
      }
    }
  }

  return text;
}

export function ChatPanel(props: ChatPanelProps) {
  return <ChatPanelContent key={props.conversationId} {...props} />;
}

function ChatPanelContent({
  conversationId,
  conversationTitle,
  conversationMode,
  initialPlan,
  initialCredits,
  initialMessages,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<UiMessage[]>(
    initialMessages.map((message) => ({
      id: message.id,
      role: mapRole(message.role),
      content: message.content,
    }))
  );

  const [input, setInput] = useState("");
  const { selectedModel, setSelectedModel } = useChatPreferences();
  const allowedModelIds = planLimits[initialPlan].allowedModelIds;
  const imageMonthlyGenerations =
    planLimits[initialPlan].imageMonthlyGenerations;
  const canGenerateImages = imageMonthlyGenerations > 0;
  const imageCreditsPerGeneration = imageGenerationConfig.creditsPerImage;
  const availableModels = aiModels.filter((model) =>
    allowedModelIds.includes(model.id)
  );
  const safeSelectedModel = allowedModelIds.includes(selectedModel)
    ? selectedModel
    : availableModels[0]?.id ?? "gpt-4o-mini";
  const [credits, setCredits] = useState(initialCredits);
  const [streaming, setStreaming] = useState(false);
  const [activeGeneration, setActiveGeneration] = useState<"text" | "image">(
    "text"
  );
  const [error, setError] = useState("");
  const [attachmentError, setAttachmentError] = useState("");
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [composerMenuOpen, setComposerMenuOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<ComposerMode>("DEFAULT");
  const [siteSearchMode, setSiteSearchMode] = useState<SiteSearchMode>("WEB");
  const [managedSites, setManagedSites] = useState<string[]>([]);
  const [siteInput, setSiteInput] = useState("");
  const [siteError, setSiteError] = useState("");
  const [sitesMenuOpen, setSitesMenuOpen] = useState(false);
  const [sitesModalOpen, setSitesModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<ImagePreview | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const composerMenuRef = useRef<HTMLDivElement | null>(null);
  const sitesMenuRef = useRef<HTMLDivElement | null>(null);

  const hasCredits = credits > 0;
  const hasImageCredits = credits >= imageCreditsPerGeneration;
  const imagePromptDetected =
    composerMode === "DEFAULT" && looksLikeImageGenerationPrompt(input);
  const canSubmit =
    !streaming &&
    hasCredits &&
    (input.trim().length > 0 ||
      (composerMode !== "IMAGE" && attachments.length > 0)) &&
    (composerMode !== "IMAGE" || (canGenerateImages && hasImageCredits));
  const currentMode =
    chatModes.find((mode) => mode.id === conversationMode) ?? chatModes[0];
  const composerPlaceholder = !hasCredits
    ? "You are out of credits..."
    : composerMode === "IMAGE"
      ? `Describe the image to generate (${imageCreditsPerGeneration} credits)...`
      : imagePromptDetected
        ? `Press send to generate this image (${imageCreditsPerGeneration} credits)`
      : "Ask, plan, debug, draft or explore...";

  useEffect(() => {
    if (safeSelectedModel !== selectedModel) {
      setSelectedModel(safeSelectedModel);
    }
  }, [safeSelectedModel, selectedModel, setSelectedModel]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }, [input]);

  useEffect(() => {
    if (!composerMenuOpen) return;

    function handlePointerDown(event: globalThis.PointerEvent) {
      if (!composerMenuRef.current?.contains(event.target as Node)) {
        setComposerMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [composerMenuOpen]);

  useEffect(() => {
    if (!sitesMenuOpen) return;

    function handlePointerDown(event: globalThis.PointerEvent) {
      if (!sitesMenuRef.current?.contains(event.target as Node)) {
        setSitesMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [sitesMenuOpen]);

  async function refreshCredits() {
    const res = await fetch("/api/me");
    const data = await res.json();

    if (res.ok && data.user) {
      setCredits(data.user.credits);
    }
  }

  async function streamAssistantResponse({
    message,
    assistantMessageId,
    retryRequest,
    retryTargetMessageId,
    previousAssistantContent,
    requestAttachments = [],
    requestComposerMode = "DEFAULT",
    requestSiteSearchMode = "WEB",
    requestSites = [],
  }: {
    message: string;
    assistantMessageId: string;
    retryRequest?: RetryRequest;
    retryTargetMessageId?: string;
    previousAssistantContent?: string;
    requestAttachments?: ComposerAttachment[];
    requestComposerMode?: ComposerMode;
    requestSiteSearchMode?: SiteSearchMode;
    requestSites?: string[];
  }) {
    setError("");
    setStreaming(true);
    setActiveGeneration("text");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId,
          message,
          model: safeSelectedModel,
          attachments: requestAttachments,
          composerMode: requestComposerMode,
          siteSearchMode: requestSiteSearchMode,
          sites: requestSites,
          retry: Boolean(retryRequest),
          retryMode: retryRequest?.mode,
          retryInstruction: retryRequest?.instruction,
          retryTargetMessageId,
        }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to send message");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pendingChunk = "";

      function appendAssistantText(textChunk: string) {
        setMessages((current) =>
          current.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: `${msg.content}${textChunk}`,
                }
              : msg
          )
        );
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        pendingChunk += decoder.decode(value, { stream: true });
        const events = pendingChunk.split("\n\n");
        pendingChunk = events.pop() ?? "";

        const textChunk = extractTextFromStreamChunk(events.join("\n"));

        if (textChunk) {
          appendAssistantText(textChunk);
        }
      }

      const finalTextChunk = extractTextFromStreamChunk(pendingChunk);

      if (finalTextChunk) {
        appendAssistantText(finalTextChunk);
      }

      await refreshCredits();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");

      if (previousAssistantContent === undefined) {
        setMessages((current) =>
          current.filter((msg) => msg.id !== assistantMessageId)
        );
      } else {
        setMessages((current) =>
          current.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: previousAssistantContent,
                }
              : msg
          )
        );
      }
    } finally {
      setStreaming(false);
    }
  }

  async function generateImageResponse({
    prompt,
    assistantMessageId,
  }: {
    prompt: string;
    assistantMessageId: string;
  }) {
    setError("");
    setStreaming(true);
    setActiveGeneration("image");

    try {
      const response = await fetch("/api/images/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId,
          prompt,
          size: imageGenerationConfig.size,
          quality: imageGenerationConfig.quality,
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        assistantMessage?: {
          id: string;
          content: string;
        };
        credits?: number;
        error?: string;
      } | null;

      if (!response.ok || !data?.assistantMessage) {
        throw new Error(data?.error || "Failed to generate image");
      }

      setMessages((current) =>
        current.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                id: data.assistantMessage?.id ?? msg.id,
                content: data.assistantMessage?.content ?? msg.content,
              }
            : msg
        )
      );

      if (typeof data.credits === "number") {
        setCredits(data.credits);
      } else {
        await refreshCredits();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setMessages((current) =>
        current.filter((msg) => msg.id !== assistantMessageId)
      );
    } finally {
      setStreaming(false);
    }
  }

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    const trimmedInput = input.trim();
    const requestComposerMode =
      composerMode === "DEFAULT" && looksLikeImageGenerationPrompt(trimmedInput)
        ? "IMAGE"
        : composerMode;
    const cleanInput =
      trimmedInput ||
      (requestComposerMode !== "IMAGE" && attachments.length > 0
        ? "Please analyze the attached file(s)."
        : "");

    if (!cleanInput || streaming || !hasCredits) return;

    if (requestComposerMode === "IMAGE") {
      if (!canGenerateImages) {
        setError(
          "OpenAI image generation is available on Pro, Builder and Team plans."
        );
        return;
      }

      if (!hasImageCredits) {
        setError(
          `Image generation needs ${imageCreditsPerGeneration} credits. You currently have ${credits.toLocaleString()}.`
        );
        return;
      }
    }

    setInput("");
    setAttachmentError("");
    setAttachments([]);
    setComposerMode("DEFAULT");

    const userMessage: UiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: cleanInput,
      attachments,
    };

    const assistantMessage: UiMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        requestComposerMode === "IMAGE" ? "Generating your image..." : "",
    };

    setMessages((current) => [...current, userMessage, assistantMessage]);

    if (requestComposerMode === "IMAGE") {
      await generateImageResponse({
        prompt: cleanInput,
        assistantMessageId: assistantMessage.id,
      });
      return;
    }

    await streamAssistantResponse({
      message: cleanInput,
      assistantMessageId: assistantMessage.id,
      requestAttachments: attachments,
      requestComposerMode,
      requestSiteSearchMode: siteSearchMode,
      requestSites: siteSearchMode === "SPECIFIC" ? managedSites : [],
    });
  }

  function applyPrompt(prompt: string) {
    if (!streaming) {
      setInput(prompt);
      textareaRef.current?.focus();
    }
  }

  function getFileExtension(fileName: string) {
    return fileName.split(".").pop()?.toLowerCase() ?? "";
  }

  function isReadableTextFile(file: File) {
    return (
      file.type.startsWith("text/") ||
      readableTextExtensions.has(getFileExtension(file.name))
    );
  }

  function readFileAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  async function handleFileArray(files: File[]) {
    if (files.length === 0) return;

    setAttachmentError("");

    const availableSlots = Math.max(0, 4 - attachments.length);

    if (availableSlots === 0) {
      setAttachmentError("You can attach up to 4 files.");
      return;
    }

    if (files.length > availableSlots) {
      setAttachmentError("You can attach up to 4 files.");
    }

    const selectedFiles = files.slice(0, availableSlots);
    const nextAttachments: ComposerAttachment[] = [];

    for (const [index, file] of selectedFiles.entries()) {
      if (file.size > 5_000_000) {
        setAttachmentError("Files must be 5MB or smaller.");
        continue;
      }

      if (file.type.startsWith("image/")) {
        const fallbackExtension = file.type.split("/")[1] || "png";

        nextAttachments.push({
          id: crypto.randomUUID(),
          name: file.name || `pasted-image-${index + 1}.${fallbackExtension}`,
          type: file.type,
          size: file.size,
          kind: "image",
          dataUrl: await readFileAsDataUrl(file),
        });
        continue;
      }

      if (isReadableTextFile(file)) {
        const text = await file.text();

        nextAttachments.push({
          id: crypto.randomUUID(),
          name: file.name || `attached-file-${index + 1}.txt`,
          type: file.type || "text/plain",
          size: file.size,
          kind: "text",
          text: text.slice(0, 16_000),
        });
        continue;
      }

      setAttachmentError(
        "This upload supports images and readable text files for now."
      );
    }

    setAttachments((current) => [...current, ...nextAttachments].slice(0, 4));
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;

    await handleFileArray(Array.from(files));
  }

  function getFilesFromClipboard(event: ClipboardEvent<HTMLTextAreaElement>) {
    const clipboardFiles = Array.from(event.clipboardData.files);
    const itemFiles = Array.from(event.clipboardData.items)
      .map((item) => (item.kind === "file" ? item.getAsFile() : null))
      .filter((file): file is File => Boolean(file));

    return [...clipboardFiles, ...itemFiles].filter(
      (file, index, allFiles) =>
        allFiles.findIndex(
          (candidate) =>
            candidate.name === file.name &&
            candidate.size === file.size &&
            candidate.type === file.type
        ) === index
    );
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const imageFiles = getFilesFromClipboard(event).filter((file) =>
      file.type.startsWith("image/")
    );

    if (imageFiles.length === 0) return;

    event.preventDefault();
    void handleFileArray(imageFiles);
  }

  function removeAttachment(attachmentId: string) {
    setAttachments((current) =>
      current.filter((attachment) => attachment.id !== attachmentId)
    );
  }

  function setGuidedMode(nextMode: ComposerMode) {
    setComposerMode((current) => (current === nextMode ? "DEFAULT" : nextMode));
    setComposerMenuOpen(false);
    textareaRef.current?.focus();
  }

  function normalizeSiteUrl(value: string) {
    const trimmed = value.trim();

    if (!trimmed) return null;

    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;

    try {
      const url = new URL(withProtocol);
      return url.toString();
    } catch {
      return null;
    }
  }

  function addManagedSites() {
    const candidates = siteInput
      .split(",")
      .map((item) => normalizeSiteUrl(item))
      .filter((item): item is string => Boolean(item));

    if (candidates.length === 0) {
      setSiteError("Enter at least one valid site URL.");
      return;
    }

    setManagedSites((current) =>
      Array.from(new Set([...current, ...candidates])).slice(0, 10)
    );
    setSiteSearchMode("SPECIFIC");
    setSiteInput("");
    setSiteError("");
  }

  function removeManagedSite(site: string) {
    setManagedSites((current) => current.filter((item) => item !== site));
  }

  function openSitesModal() {
    setSitesMenuOpen(false);
    setSitesModalOpen(true);
    setSiteError("");
  }

  function retryFromMessage(messageIndex: number, retryRequest: RetryRequest) {
    if (streaming || !hasCredits) return;

    const previousUserMessage = messages
      .slice(0, messageIndex)
      .reverse()
      .find((message) => message.role === "user");
    const assistantMessage = messages[messageIndex];

    if (!previousUserMessage || assistantMessage?.role !== "assistant") return;

    setMessages((current) =>
      current.map((message) =>
        message.id === assistantMessage.id
          ? {
              ...message,
              content: "",
            }
          : message
      )
    );

    void streamAssistantResponse({
      message: previousUserMessage.content,
      assistantMessageId: assistantMessage.id,
      retryRequest,
      retryTargetMessageId: assistantMessage.id,
      previousAssistantContent: assistantMessage.content,
    });
  }

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-30 flex min-w-0 flex-col overflow-hidden bg-slate-950 lg:static lg:z-auto lg:h-screen lg:flex-1">
      <div className="border-b border-white/10 bg-slate-950/95 px-3 py-2 backdrop-blur sm:px-6">
        <div className="flex items-center gap-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300 sm:flex">
              <Bot className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <h1 className="max-w-[15rem] truncate text-sm font-black tracking-tight text-white sm:max-w-none sm:text-base">
                {conversationTitle}
              </h1>

              <div className="mt-0.5 flex min-w-0 items-center gap-2 text-[11px] font-bold text-slate-500">
                <span className="inline-flex items-center gap-1.5 text-cyan-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                  {currentMode.name}
                </span>
                <span className="text-slate-700">/</span>
                <span>{credits.toLocaleString()} credits</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!hasCredits ? (
        <div className="border-b border-red-400/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
          You are out of credits. Billing and top-up are available from the
          billing page.
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6 sm:py-6">
        {messages.length === 0 ? (
          <div className="mx-auto flex min-h-full max-w-3xl items-center justify-center pb-20 text-center sm:pb-24">
            <div>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-3xl bg-cyan-400/10 text-cyan-300 sm:h-16 sm:w-16">
                <Sparkles className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <h2 className="mt-5 text-2xl font-black tracking-tight text-white sm:mt-6 sm:text-5xl">
                Start with a sharp question.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
                Nexus keeps the conversation saved, renders markdown cleanly and
                stays aware of the selected mode and model.
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => applyPrompt(prompt)}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-5 pb-24 pt-2 sm:space-y-8 sm:pb-28 sm:pt-4">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={
                  message.role === "user"
                    ? "flex justify-end"
                    : "flex flex-col items-start"
                }
              >
                <div
                  className={
                    message.role === "user"
                      ? "max-w-[86%] rounded-[1.25rem] bg-white px-4 py-3 text-sm leading-7 text-slate-950 shadow-lg shadow-black/10 sm:max-w-[70%] sm:rounded-[1.35rem] sm:px-5 sm:py-4"
                      : "max-w-[92%] rounded-[1.25rem] bg-[#262626] px-4 py-3 text-sm leading-7 text-slate-100 sm:max-w-[78%] sm:rounded-[1.35rem] sm:px-5 sm:py-4"
                  }
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] opacity-70">
                      {message.role === "user" ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-cyan-300" />
                      )}
                      {message.role === "user" ? "You" : "Nexus AI"}
                    </div>

                    {message.role === "user" && message.content ? (
                      <CopyButton text={message.content} />
                    ) : null}
                  </div>

                  {message.role === "assistant" ? (
                    <MessageContent content={message.content || "Thinking..."} />
                  ) : (
                    <div>
                      {message.attachments?.length ? (
                        <AttachmentPreviewList
                          attachments={message.attachments}
                          variant="message"
                          onPreview={setPreviewImage}
                        />
                      ) : null}

                      <div className="whitespace-pre-wrap">{message.content}</div>
                    </div>
                  )}
                </div>

                {message.role === "assistant" && message.content ? (
                  <ResponseActions
                    text={message.content}
                    onRetry={(request) => retryFromMessage(index, request)}
                    disabled={streaming || !hasCredits}
                  />
                ) : null}
              </div>
            ))}
          </div>
        )}

        {streaming ? (
          <div className="mx-auto mt-5 flex max-w-4xl items-center gap-2 text-sm font-bold text-cyan-200">
            <Loader2 className="h-4 w-4 animate-spin" />
            {activeGeneration === "image"
              ? "Nexus is generating an image"
              : "Nexus is thinking"}
          </div>
        ) : null}

        {error ? (
          <div className="mx-auto mt-5 max-w-4xl rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-white/10 bg-slate-950/95 px-2.5 pb-3 pt-2 backdrop-blur-xl sm:px-5 sm:pb-4"
      >
        <div className="mx-auto max-w-3xl rounded-[1.35rem] bg-[#242424] p-2 shadow-2xl shadow-black/30 ring-1 ring-white/10 sm:rounded-[1.5rem]">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.txt,.md,.csv,.json,.js,.jsx,.ts,.tsx,.css,.html,.xml,.yaml,.yml,.log"
            className="hidden"
            onChange={(event) => {
              void handleFiles(event.target.files);
              event.target.value = "";
            }}
          />

          {attachments.length > 0 || attachmentError ? (
            <div className="mb-2 px-1">
              <AttachmentPreviewList
                attachments={attachments}
                variant="composer"
                onPreview={setPreviewImage}
                onRemove={removeAttachment}
              />

              {attachmentError ? (
                <p className="mt-2 px-1 text-xs font-semibold text-red-200">
                  {attachmentError}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex items-center gap-2">
              <div ref={composerMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setComposerMenuOpen((value) => !value)}
                  disabled={streaming}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:w-11"
                  aria-label="Open attachment and tools menu"
                >
                  <Plus className="h-5 w-5" />
                </button>

                {composerMenuOpen ? (
                  <div className="absolute bottom-11 left-0 z-50 w-72 rounded-[1.25rem] border border-white/10 bg-[#333333] p-2 shadow-2xl shadow-black/50 sm:bottom-14">
                    <ComposerMenuButton
                      icon={<Paperclip className="h-5 w-5" />}
                      label="Add photos & files"
                      onClick={() => {
                        setComposerMenuOpen(false);
                        fileInputRef.current?.click();
                      }}
                    />
                    <ComposerMenuButton
                      icon={<FileText className="h-5 w-5" />}
                      label="Recent files"
                      detail={attachments.length ? `${attachments.length} attached` : "No recent files"}
                      disabled
                    />
                    <div className="my-1 h-px bg-white/10" />
                    <ComposerMenuButton
                      icon={<ImageIcon className="h-5 w-5" />}
                      label="Create image"
                      detail={
                        canGenerateImages
                          ? `${imageCreditsPerGeneration} credits`
                          : "Pro+"
                      }
                      active={composerMode === "IMAGE"}
                      disabled={!canGenerateImages}
                      onClick={() => setGuidedMode("IMAGE")}
                    />
                    <ComposerMenuButton
                      icon={<Brain className="h-5 w-5" />}
                      label="Thinking"
                      active={composerMode === "THINKING"}
                      onClick={() => setGuidedMode("THINKING")}
                    />
                    <ComposerMenuButton
                      icon={<Search className="h-5 w-5" />}
                      label="Deep research"
                      active={composerMode === "DEEP_RESEARCH"}
                      onClick={() => setGuidedMode("DEEP_RESEARCH")}
                    />
                    <ComposerMenuButton
                      icon={<Globe className="h-5 w-5" />}
                      label="Web search"
                      active={composerMode === "WEB_SEARCH"}
                      onClick={() => setGuidedMode("WEB_SEARCH")}
                    />
                  </div>
                ) : null}
              </div>

              <div className="relative w-fit shrink-0">
                <select
                  value={safeSelectedModel}
                  onChange={(event) =>
                    setSelectedModel(event.target.value as AiModelId)
                  }
                  disabled={streaming}
                  aria-label="Choose assistant model"
                  className="h-8 appearance-none rounded-xl border border-white/10 bg-white/[0.06] pl-3 pr-8 text-[11px] font-black text-white outline-none transition hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-60 sm:h-11 sm:rounded-2xl sm:pl-3.5 sm:pr-9 sm:text-xs"
                >
                  {availableModels.map((model) => (
                    <option key={model.id} value={model.id} className="bg-[#242424]">
                      {model.name}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 sm:text-xs">
                  v
                </span>
              </div>

              {composerMode !== "DEFAULT" ? (
                <button
                  type="button"
                  onClick={() => setComposerMode("DEFAULT")}
                  className="inline-flex h-8 items-center gap-2 rounded-full px-3 text-xs font-black text-cyan-100 transition hover:bg-white/10 sm:h-11 sm:text-sm"
                >
                  {composerMode === "DEEP_RESEARCH" ? (
                    <Search className="h-4 w-4" />
                  ) : composerMode === "WEB_SEARCH" ? (
                    <Globe className="h-4 w-4" />
                  ) : composerMode === "IMAGE" ? (
                    <ImageIcon className="h-4 w-4" />
                  ) : (
                    <Brain className="h-4 w-4" />
                  )}
                  {composerModeLabels[composerMode]}
                </button>
              ) : null}

              {imagePromptDetected ? (
                <button
                  type="button"
                  onClick={() => setGuidedMode("IMAGE")}
                  className="inline-flex h-8 items-center gap-2 rounded-full bg-cyan-400/10 px-3 text-xs font-black text-cyan-100 ring-1 ring-cyan-300/20 transition hover:bg-cyan-400/15 sm:h-11 sm:text-sm"
                >
                  <ImageIcon className="h-4 w-4" />
                  Image
                </button>
              ) : null}

              {composerMode === "DEEP_RESEARCH" || composerMode === "WEB_SEARCH" ? (
                <div ref={sitesMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setSitesMenuOpen((value) => !value)}
                    className="inline-flex h-8 items-center gap-2 rounded-full bg-white/10 px-3 text-xs font-black text-slate-100 transition hover:bg-white/15 sm:h-11 sm:text-sm"
                    aria-label="Choose research sites"
                  >
                    <Globe className="h-4 w-4" />
                    Sites
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  </button>

                  {sitesMenuOpen ? (
                    <div className="absolute bottom-11 left-0 z-50 w-72 rounded-[1.25rem] border border-white/10 bg-[#333333] p-2 shadow-2xl shadow-black/50 sm:bottom-14">
                      <SitesMenuOption
                        icon={<Globe className="h-5 w-5" />}
                        label="Search the web"
                        active={siteSearchMode === "WEB"}
                        onClick={() => {
                          setSiteSearchMode("WEB");
                          setSitesMenuOpen(false);
                        }}
                      />
                      <SitesMenuOption
                        icon={<Search className="h-5 w-5" />}
                        label={`Specific sites (${managedSites.length})`}
                        active={siteSearchMode === "SPECIFIC"}
                        onClick={() => {
                          setSiteSearchMode("SPECIFIC");
                          setSitesMenuOpen(false);
                        }}
                      />
                      <div className="my-1 h-px bg-white/10" />
                      <SitesMenuOption
                        icon={<ArrowUp className="h-5 w-5 rotate-90" />}
                        label="Manage sites"
                        onClick={openSitesModal}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex min-w-0 flex-1 items-end gap-2">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onPaste={handlePaste}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSubmit();
                  }
                }}
                placeholder={
                  composerPlaceholder
                }
                disabled={streaming || !hasCredits}
                className="max-h-36 min-h-10 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm leading-6 text-white outline-none placeholder:text-slate-500 disabled:opacity-60 sm:max-h-44 sm:min-h-11 sm:py-3"
              />

              <button
                type="submit"
                disabled={!canSubmit}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500 sm:h-11 sm:w-11"
                aria-label="Send message"
              >
                <ArrowUp className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </form>

      {sitesModalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[1.4rem] border border-white/10 bg-[#262626] p-5 shadow-2xl shadow-black/60 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-black text-white sm:text-xl">
                Search specific sites
              </h2>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white"
                  aria-label="More site options"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSitesModalOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white"
                  aria-label="Close site manager"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <input
                value={siteInput}
                onChange={(event) => setSiteInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addManagedSites();
                  }
                }}
                placeholder="Add site URLs, separated by commas"
                className="min-w-0 flex-1 rounded-full bg-black px-5 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                autoFocus
              />

              <button
                type="button"
                onClick={addManagedSites}
                disabled={!siteInput.trim()}
                className="rounded-full bg-white/20 px-5 py-3 text-sm font-black text-white transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add
              </button>
            </div>

            {siteError ? (
              <p className="mt-3 text-sm font-semibold text-red-200">{siteError}</p>
            ) : null}

            {managedSites.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {managedSites.map((site) => (
                  <button
                    key={site}
                    type="button"
                    onClick={() => removeManagedSite(site)}
                    className="inline-flex max-w-full items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-200 ring-1 ring-white/10"
                    title="Remove site"
                  >
                    <Globe className="h-3.5 w-3.5 text-cyan-200" />
                    <span className="max-w-56 truncate">{site}</span>
                    <X className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {previewImage ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 px-4 py-8 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-h-full w-full max-w-5xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="truncate text-sm font-black text-white">
                {previewImage.name}
              </p>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/15"
                aria-label="Close image preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage.src}
              alt={previewImage.name}
              className="mx-auto max-h-[78dvh] max-w-full rounded-[1.5rem] border border-white/10 object-contain shadow-2xl shadow-black/50"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AttachmentPreviewList({
  attachments,
  variant,
  onPreview,
  onRemove,
}: {
  attachments: ComposerAttachment[];
  variant: "composer" | "message";
  onPreview: (image: ImagePreview) => void;
  onRemove?: (attachmentId: string) => void;
}) {
  const imageAttachments = attachments.filter(
    (attachment) => attachment.kind === "image" && attachment.dataUrl
  );
  const fileAttachments = attachments.filter(
    (attachment) => attachment.kind !== "image" || !attachment.dataUrl
  );

  return (
    <div
      className={cn(
        "space-y-2",
        variant === "message" ? "mb-3" : "mb-1"
      )}
    >
      {imageAttachments.length > 0 ? (
        <div
          className={cn(
            "flex flex-wrap gap-2",
            variant === "message" && "justify-end"
          )}
        >
          {imageAttachments.map((attachment) => (
            <div
              key={attachment.id}
              className={cn(
                "group relative overflow-hidden rounded-2xl border bg-slate-950/5",
                variant === "composer"
                  ? "h-24 w-24 border-white/10"
                  : "max-h-72 max-w-full border-slate-950/10"
              )}
            >
              <button
                type="button"
                onClick={() =>
                  onPreview({
                    src: attachment.dataUrl ?? "",
                    name: attachment.name,
                  })
                }
                className={cn(
                  "block h-full w-full overflow-hidden text-left",
                  variant === "message" ? "cursor-zoom-in" : "cursor-pointer"
                )}
                aria-label={`Preview ${attachment.name}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={attachment.dataUrl}
                  alt={attachment.name}
                  className={cn(
                    "h-full w-full object-cover",
                    variant === "message" && "max-h-72 object-contain"
                  )}
                />
              </button>

              {onRemove ? (
                <button
                  type="button"
                  onClick={() => onRemove(attachment.id)}
                  className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white shadow-lg transition hover:bg-black"
                  aria-label={`Remove ${attachment.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}

              {variant === "composer" ? (
                <div className="absolute inset-x-0 bottom-0 bg-black/65 px-2 py-1">
                  <p className="truncate text-[11px] font-bold text-white">
                    {attachment.name}
                  </p>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {fileAttachments.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {fileAttachments.map((attachment) =>
            onRemove ? (
              <button
                key={attachment.id}
                type="button"
                onClick={() => onRemove(attachment.id)}
                className="inline-flex max-w-full items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-200 ring-1 ring-white/10"
                title="Remove attachment"
              >
                <FileText className="h-3.5 w-3.5 text-cyan-200" />
                <span className="max-w-36 truncate">{attachment.name}</span>
                <X className="h-3.5 w-3.5 text-slate-400" />
              </button>
            ) : (
              <div
                key={attachment.id}
                className="inline-flex max-w-full items-center gap-2 rounded-xl bg-slate-950/10 px-2.5 py-1.5 text-xs font-bold text-slate-700"
              >
                <FileText className="h-3.5 w-3.5" />
                <span className="truncate">{attachment.name}</span>
              </div>
            )
          )}
        </div>
      ) : null}
    </div>
  );
}

function ComposerMenuButton({
  icon,
  label,
  detail,
  active = false,
  disabled = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  detail?: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45",
        active && "bg-cyan-400/10 text-cyan-100"
      )}
    >
      <span className={cn("text-slate-200", active && "text-cyan-200")}>
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {detail ? (
        <span className="shrink-0 text-xs font-medium text-slate-400">
          {detail}
        </span>
      ) : null}
    </button>
  );
}

function SitesMenuOption({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-100 transition hover:bg-white/10",
        active && "bg-white/5"
      )}
    >
      <span className="text-slate-200">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {active ? <Check className="h-4 w-4 text-white" /> : null}
    </button>
  );
}
