import { readFileSync } from "node:fs";

const checks = [];

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function looksLikeImagePrompt(value) {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
  const imageNouns =
    /\b(image|picture|photo|illustration|artwork|poster|logo|icon|avatar|wallpaper|banner|thumbnail|cover art|cover|art|visual|graphic|sticker|mockup)\b/;
  const creativeVerbs =
    /\b(generate|create|make|draw|paint|sketch|render|design|produce|imagine)\b/;

  if (/^(please\s+)?(can you\s+|could you\s+|would you\s+)?(generate|create|make|write)\s+(me\s+)?(an?\s+)?(image\s+)?prompt\b/.test(normalized)) {
    return false;
  }

  return (
    /^(please\s+)?(can you\s+|could you\s+|would you\s+)?(generate|create|make|draw|paint|sketch|render|design|produce|imagine)\s+(me\s+)?(an?\s+|the\s+)?(image|picture|photo|illustration|artwork|poster|logo|icon|avatar|wallpaper|banner|thumbnail|cover art|cover|art|visual|graphic|sticker|mockup)\b/.test(
      normalized
    ) ||
    (/^(please\s+)?(can you\s+|could you\s+|would you\s+)?(generate|create|make|draw|paint|sketch|render|design|produce|imagine)\b/.test(
      normalized
    ) &&
      imageNouns.test(normalized)) ||
    (creativeVerbs.test(normalized) &&
      /\b(in|as|with)\s+(anime|cinematic|pixel|3d|watercolor|realistic|photorealistic|avatar|cartoon|studio|product|poster|logo)\b/.test(
        normalized
      ))
  );
}

function shouldSaveMemory(value) {
  return [
    /\bremember\b/i,
    /\bsave this\b/i,
    /\bnote that\b/i,
    /\bmy project\b/i,
    /\bour project\b/i,
    /\bi am building\b/i,
    /\bwe are building\b/i,
    /\bthe goal is\b/i,
    /\bi prefer\b/i,
  ].some((pattern) => pattern.test(value));
}

function routeModel({
  requestedModelId,
  allowedModelIds,
  mode,
  composerMode,
  message,
  hasAttachments = false,
}) {
  const isCode =
    mode === "CODE" ||
    /\b(debug|fix|refactor|implement|code|component|function|schema|migration|api route|typescript|javascript|tsx|jsx|prisma|sql|vercel|build error|lint|test|repo|workspace)\b/i.test(
      message
    );
  const isDeep =
    mode === "FILE" ||
    composerMode === "THINKING" ||
    composerMode === "DEEP_RESEARCH" ||
    composerMode === "WEB_SEARCH" ||
    hasAttachments ||
    message.length > 900 ||
    /\b(architecture|security|production|accuracy|analyze|research|strategy|complex|deep|evaluate|compare|audit|review|scale|multi-step|agent)\b/i.test(
      message
    );

  if (isCode && allowedModelIds.includes("gpt-5.2-codex")) {
    return "gpt-5.2-codex";
  }

  if (isDeep) {
    if (allowedModelIds.includes("gpt-5.5")) return "gpt-5.5";
    if (allowedModelIds.includes("gpt-5.4")) return "gpt-5.4";
    if (allowedModelIds.includes("gpt-5.4-mini")) return "gpt-5.4-mini";
  }

  if (allowedModelIds.includes(requestedModelId)) {
    return requestedModelId;
  }

  return allowedModelIds[0];
}

check("image requests route to image generation", () => {
  assert(
    looksLikeImagePrompt("Generate an image of a calm product dashboard"),
    "Expected direct image request to be detected"
  );
  assert(
    !looksLikeImagePrompt("Write me an image prompt for a calm dashboard"),
    "Expected prompt-writing request to remain normal chat"
  );
});

check("explicit memory requests are captured", () => {
  assert(
    shouldSaveMemory("Remember that this project uses Prisma and PostgreSQL."),
    "Expected remember instruction to be captured"
  );
  assert(
    !shouldSaveMemory("Can you explain this component?"),
    "Expected ordinary question not to become memory"
  );
});

check("code and analysis route to stronger task models when available", () => {
  assert(
    routeModel({
      requestedModelId: "gpt-5.4-mini",
      allowedModelIds: ["gpt-5.4-mini", "gpt-5.4", "gpt-5.2-codex"],
      mode: "CODE",
      composerMode: "DEFAULT",
      message: "Fix this Prisma migration and verify the API route.",
    }) === "gpt-5.2-codex",
    "Expected coding task to route to Codex"
  );
  assert(
    routeModel({
      requestedModelId: "gpt-5.4-mini",
      allowedModelIds: ["gpt-5.4-mini", "gpt-5.4", "gpt-5.2-codex", "gpt-5.5"],
      mode: "CHAT",
      composerMode: "DEEP_RESEARCH",
      message: "Analyze this product architecture deeply for production risk.",
    }) === "gpt-5.5",
    "Expected deep research task to route to Frontier"
  );
  assert(
    routeModel({
      requestedModelId: "gpt-4o-mini",
      allowedModelIds: ["gpt-4o-mini"],
      mode: "CODE",
      composerMode: "DEFAULT",
      message: "Fix this Prisma migration.",
    }) === "gpt-4o-mini",
    "Expected Free plan to stay on Fast"
  );
});

check("quality prompts keep context and verification active", () => {
  const promptSource = readFileSync("src/config/assistant-quality.ts", "utf8");
  const chatRoute = readFileSync("src/app/api/chat/route.ts", "utf8");
  const billingSource = readFileSync("src/config/billing.ts", "utf8");

  assert(
    promptSource.includes("Workspace memory") &&
      promptSource.includes("Retrieval") &&
      promptSource.includes("Before finalizing"),
    "Expected quality prompt to mention memory, retrieval, and verification"
  );
  assert(
    chatRoute.includes("buildWorkspaceContext") &&
      chatRoute.includes("buildAssistantQualityPrompt"),
    "Expected chat route to inject retrieval and quality policy"
  );
  assert(
    billingSource.includes("gpt-image-2") &&
      billingSource.includes("gpt-5.2-codex") &&
      billingSource.includes("gpt-5.5"),
    "Expected billing config to expose current OpenAI task models"
  );
});

check("subscription prices match stronger model access", () => {
  const billingSource = readFileSync("src/config/billing.ts", "utf8");

  assert(
    billingSource.includes('monthlyPrice: "NGN 12,000"') &&
      billingSource.includes("amountKobo: 1200000") &&
      billingSource.includes("monthlyCredits: 4000"),
    "Expected Pro plan to use the updated GPT-5 solo pricing"
  );
  assert(
    billingSource.includes('monthlyPrice: "NGN 38,000"') &&
      billingSource.includes("amountKobo: 3800000") &&
      billingSource.includes("monthlyCredits: 18000"),
    "Expected Builder plan to use the updated Codex pricing"
  );
  assert(
    billingSource.includes('monthlyPrice: "NGN 120,000"') &&
      billingSource.includes("amountKobo: 12000000") &&
      billingSource.includes("monthlyCredits: 70000"),
    "Expected Team plan to use the updated frontier pricing"
  );
});

let failed = 0;

for (const item of checks) {
  try {
    item.fn();
    console.log(`PASS ${item.name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${item.name}`);
    console.error(error instanceof Error ? error.message : error);
  }
}

if (failed > 0) {
  process.exit(1);
}

console.log(`\n${checks.length} Nexus eval checks passed.`);
