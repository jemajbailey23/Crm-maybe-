"use client";

import { useRef, useState, useTransition } from "react";
import { uploadBrandAsset, removeBrandAsset } from "./actions";
import type { BrandAsset, BrandAssetSlot } from "@prisma/client";

export function BrandAssetSlotUpload({
  token,
  slot,
  label,
  hint,
  assets,
  onAdded,
  onRemoved,
}: {
  token: string;
  slot: BrandAssetSlot;
  label: string;
  hint: string;
  assets: BrandAsset[];
  onAdded: (asset: BrandAsset) => void;
  onRemoved: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await uploadBrandAsset(token, slot, formData);
      if (result.error) setError(result.error);
      if (!result.error) {
        // The action doesn't return the created row, so build an optimistic
        // one for the list — the next full page load reconciles with the
        // real one from the DB either way.
        onAdded({
          id: `pending-${Date.now()}`,
          slot,
          filename: file.name,
          url: URL.createObjectURL(file),
          path: "",
          sizeBytes: file.size,
          mimeType: file.type || null,
          createdAt: new Date(),
          contactId: "",
        });
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function remove(id: string) {
    onRemoved(id);
    startTransition(() => {
      removeBrandAsset(token, id);
    });
  }

  return (
    <div className="rounded-lg border border-dashed border-zinc-700 p-4 text-center transition-colors hover:border-indigo-500/50">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {assets.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="flex w-full flex-col items-center gap-1.5 disabled:opacity-50"
        >
          <span className="text-xl text-zinc-500">↑</span>
          <span className="text-sm font-medium text-zinc-300">{label}</span>
          <span className="text-xs text-zinc-500">{hint}</span>
        </button>
      ) : (
        <div className="space-y-2 text-left">
          <p className="text-xs font-medium text-zinc-400">{label}</p>
          <ul className="space-y-1">
            {assets.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 rounded bg-zinc-800/60 px-2 py-1 text-xs">
                <span className="truncate text-zinc-300">{a.filename}</span>
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  disabled={pending}
                  className="shrink-0 text-zinc-500 hover:text-red-400 disabled:opacity-50"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className="text-xs font-medium text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
          >
            + Add another
          </button>
        </div>
      )}
      {error && (
        <p className="mt-2 text-xs text-red-400" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}
