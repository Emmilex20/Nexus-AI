const imageNouns =
  /\b(image|picture|photo|illustration|artwork|poster|logo|icon|avatar|wallpaper|banner|thumbnail|cover art|cover|art|visual|graphic|sticker|mockup)\b/;

const creativeVerbs =
  /\b(generate|create|make|draw|paint|sketch|render|design|produce|imagine)\b/;

export function looksLikeImageGenerationPrompt(value: string) {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");

  if (!normalized) return false;

  const asksForPromptOnly =
    /^(please\s+)?(can you\s+|could you\s+|would you\s+)?(generate|create|make|write)\s+(me\s+)?(an?\s+)?(image\s+)?prompt\b/.test(
      normalized
    );

  if (asksForPromptOnly) return false;

  const directImageCommand =
    /^(please\s+)?(can you\s+|could you\s+|would you\s+)?(generate|create|make|draw|paint|sketch|render|design|produce|imagine)\s+(me\s+)?(an?\s+|the\s+)?(image|picture|photo|illustration|artwork|poster|logo|icon|avatar|wallpaper|banner|thumbnail|cover art|cover|art|visual|graphic|sticker|mockup)\b/;

  const commandWithImageTarget =
    /^(please\s+)?(can you\s+|could you\s+|would you\s+)?(generate|create|make|draw|paint|sketch|render|design|produce|imagine)\b/.test(
      normalized
    ) && imageNouns.test(normalized);

  const imageStyleRequest =
    creativeVerbs.test(normalized) &&
    /\b(in|as|with)\s+(anime|cinematic|pixel|3d|watercolor|realistic|photorealistic|avatar|cartoon|studio|product|poster|logo)\b/.test(
      normalized
    );

  return (
    directImageCommand.test(normalized) ||
    commandWithImageTarget ||
    imageStyleRequest
  );
}
