"use client";

import { Cpu, Zap } from "lucide-react";
import { aiModels, type AiModelId } from "@/config/ai-models";
import { cn } from "@/lib/utils";

type ModelSelectorProps = {
  value: AiModelId;
  onChange: (value: AiModelId) => void;
  disabled?: boolean;
  compact?: boolean;
};

const modelIcons = {
  "gpt-4o-mini": Zap,
  "gpt-4.1-mini": Cpu,
} as const;

export function ModelSelector({
  value,
  onChange,
  disabled,
  compact,
}: ModelSelectorProps) {
  return (
    <div className={compact ? "grid gap-1.5" : "flex flex-wrap gap-2"}>
      {aiModels.map((model) => {
        const active = value === model.id;
        const Icon = modelIcons[model.id];

        return (
          <button
            key={model.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(model.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-60",
              compact && "w-full justify-between rounded-xl px-2.5 py-2",
              active
                ? "border-cyan-300/40 bg-cyan-400/15 text-cyan-100"
                : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white"
            )}
            title={model.description}
          >
            <span className="inline-flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {model.name}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px]",
                active ? "bg-cyan-200/15" : "bg-white/10"
              )}
            >
              {model.creditsPerMessage} credit
            </span>
          </button>
        );
      })}
    </div>
  );
}
