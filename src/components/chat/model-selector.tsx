"use client";

import { aiModels, type AiModelId } from "@/config/ai-models";

type ModelSelectorProps = {
  value: AiModelId;
  onChange: (value: AiModelId) => void;
  disabled?: boolean;
};

export function ModelSelector({
  value,
  onChange,
  disabled,
}: ModelSelectorProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {aiModels.map((model) => {
        const active = value === model.id;

        return (
          <button
            key={model.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(model.id)}
            className={
              active
                ? "rounded-2xl border border-violet-400/50 bg-violet-500/15 p-4 text-left"
                : "rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:bg-white/[0.07]"
            }
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black text-white">{model.name}</p>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-300">
                {model.creditsPerMessage} credit
              </span>
            </div>

            <p className="mt-2 text-xs leading-5 text-slate-400">
              {model.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
