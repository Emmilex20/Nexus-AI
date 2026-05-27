import { chatModes, type ChatMode } from "@/config/ai-models";

type ModeBadgeProps = {
  mode: ChatMode;
};

export function ModeBadge({ mode }: ModeBadgeProps) {
  const currentMode = chatModes.find((item) => item.id === mode) ?? chatModes[0];

  return (
    <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-100">
      {currentMode.name} mode
    </span>
  );
}
