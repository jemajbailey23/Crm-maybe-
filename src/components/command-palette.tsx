"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { globalSearch, type SearchResult } from "@/app/(app)/search-actions";

const TYPE_LABELS: Record<SearchResult["type"], string> = {
  contact: "Contact",
  company: "Company",
  deal: "Deal",
  task: "Task",
  project: "Project",
};

function SearchIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className}
    >
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="m20 20-3.5-3.5" />
    </svg>
  );
}

function CommandPaletteModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const navigateTo = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router]
  );

  function handleQueryChange(next: string) {
    setQuery(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!next.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(() => {
      globalSearch(next).then((data) => {
        setResults(data);
        setActiveIndex(0);
        setLoading(false);
      });
    }, 200);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[15vh]">
      <div
        className="animate-overlay-in fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="animate-scale-in relative w-full max-w-lg overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/50">
        <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
          <SearchIcon className="h-4 w-4 shrink-0 text-zinc-500" />
          <input
            autoFocus
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && results[activeIndex]) {
                e.preventDefault();
                navigateTo(results[activeIndex].href);
              } else if (e.key === "Escape") {
                onClose();
              }
            }}
            placeholder="Search contacts, companies, deals, projects, tasks…"
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          />
          <kbd className="shrink-0 rounded border border-zinc-700 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">
            ESC
          </kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {loading && (
            <p className="px-3 py-6 text-center text-sm text-zinc-500">
              Searching…
            </p>
          )}
          {!loading && query && results.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-zinc-500">
              No results for &quot;{query}&quot;
            </p>
          )}
          {!loading && !query && (
            <p className="px-3 py-6 text-center text-sm text-zinc-500">
              Start typing to search everything…
            </p>
          )}
          {!loading &&
            results.map((r, i) => (
              <button
                key={`${r.type}-${r.id}`}
                type="button"
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => navigateTo(r.href)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  i === activeIndex
                    ? "bg-indigo-500/10 text-zinc-50"
                    : "text-zinc-300"
                }`}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{r.title}</span>
                  {r.subtitle && (
                    <span className="truncate text-xs text-zinc-500">
                      {r.subtitle}
                    </span>
                  )}
                </span>
                <span className="ml-2 shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                  {TYPE_LABELS[r.type]}
                </span>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-left text-sm text-zinc-500 transition-colors hover:border-zinc-700 hover:text-zinc-300"
      >
        <SearchIcon className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">Search everything…</span>
        <kbd className="hidden shrink-0 rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 sm:inline">
          ⌘K
        </kbd>
      </button>

      {open && <CommandPaletteModal onClose={() => setOpen(false)} />}
    </>
  );
}
