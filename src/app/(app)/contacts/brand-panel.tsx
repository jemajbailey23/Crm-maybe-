"use client";

import { useActionState, useState, useTransition } from "react";
import { updateBrandVoice, deleteBrandAsset, type BrandVoiceFormState } from "./brand-actions";
import { BRAND_ASSET_SLOTS, BRAND_VOICE_OPTIONS } from "@/lib/brand-assets";
import type { BrandAsset } from "@prisma/client";

const initialState: BrandVoiceFormState = {};

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-zinc-300";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BrandPanel({
  contactId,
  defaultValues,
  assets,
}: {
  contactId: string;
  defaultValues: {
    brandVoice?: string | null;
    brandDescription?: string | null;
    brandDifferentiators?: string | null;
    brandAvoidWords?: string | null;
  };
  assets: BrandAsset[];
}) {
  const action = updateBrandVoice.bind(null, contactId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [voice, setVoice] = useState(defaultValues.brandVoice ?? "");
  const [liveAssets, setLiveAssets] = useState(assets);
  const [, startTransition] = useTransition();

  function remove(id: string) {
    setLiveAssets((prev) => prev.filter((a) => a.id !== id));
    startTransition(() => {
      deleteBrandAsset(contactId, id);
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-xs font-medium text-zinc-400">Brand files</h3>
        {liveAssets.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No files uploaded yet — the client can add these from their onboarding link.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {BRAND_ASSET_SLOTS.map((s) => {
              const slotAssets = liveAssets.filter((a) => a.slot === s.slot);
              if (slotAssets.length === 0) return null;
              return (
                <div key={s.slot} className="rounded-lg border border-zinc-800 p-3">
                  <p className="mb-2 text-xs font-medium text-zinc-400">{s.label}</p>
                  <ul className="space-y-1">
                    {slotAssets.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between gap-2 rounded bg-zinc-800/60 px-2 py-1 text-xs"
                      >
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-w-0 truncate text-zinc-300 hover:text-indigo-400"
                        >
                          {a.filename}
                        </a>
                        <span className="shrink-0 text-zinc-600">{formatBytes(a.sizeBytes)}</span>
                        <button
                          type="button"
                          onClick={() => remove(a.id)}
                          className="shrink-0 text-zinc-500 hover:text-red-400"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <form action={formAction} className="space-y-4">
        <div>
          <label className={labelClass}>Brand voice</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {BRAND_VOICE_OPTIONS.map((tone) => (
              <button
                key={tone}
                type="button"
                onClick={() => setVoice(tone)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  voice === tone
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                    : "border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                {tone}
              </button>
            ))}
          </div>
          <input type="hidden" name="brandVoice" value={voice} />
        </div>
        <div>
          <label className={labelClass}>Business description</label>
          <textarea
            name="brandDescription"
            rows={3}
            defaultValue={defaultValues.brandDescription ?? ""}
            placeholder="What they do, who they serve, and their mission…"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>What makes them different?</label>
          <textarea
            name="brandDifferentiators"
            rows={2}
            defaultValue={defaultValues.brandDifferentiators ?? ""}
            placeholder="What sets them apart from competitors?"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Words or claims to avoid</label>
          <textarea
            name="brandAvoidWords"
            rows={2}
            defaultValue={defaultValues.brandAvoidWords ?? ""}
            className={inputClass}
          />
        </div>
        {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
