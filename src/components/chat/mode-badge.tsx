import { chatModes, type ChatMode } from "@/config/ai-models";

type ModeBadgeProps = {
  mode: ChatMode;
};

export function ModeBadge({ mode }: ModeBadgeProps) {
  const currentMode = chatModes.find((item) => item.id === mode) ?? chatModes[0];

  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300">
      {currentMode.name} mode
    </span>
  );
}
