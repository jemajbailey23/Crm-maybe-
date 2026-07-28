"use client";

import { useState, useTransition } from "react";
import { updateBrandColor } from "./actions";
import { BRAND_COLOR_PRESETS, BRAND_COLOR_KEYS, type BrandColorKey } from "@/lib/brand-colors";

export function BrandColorPicker({ current }: { current: string }) {
  const [selected, setSelected] = useState(current);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-3">
      {BRAND_COLOR_KEYS.map((key: BrandColorKey) => {
        const preset = BRAND_COLOR_PRESETS[key];
        const active = selected === key;
        return (
          <button
            key={key}
            type="button"
            disabled={isPending}
            onClick={() => {
              setSelected(key);
              startTransition(() => {
                updateBrandColor(key);
              });
            }}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors disabled:opacity-50 ${
              active
                ? "border-zinc-600 bg-zinc-800 text-zinc-100"
                : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700"
            }`}
          >
            <span
              className="h-3.5 w-3.5 rounded-full"
              style={{ backgroundColor: preset.swatch }}
            />
            {preset.label}
          </button>
        );
      })}
    </div>
  );
}
