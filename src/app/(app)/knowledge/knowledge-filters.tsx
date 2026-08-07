"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const selectClass =
  "rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

const STATUSES = [
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Published" },
  { value: "ARCHIVED", label: "Archived" },
];

const VISIBILITIES = [
  { value: "BVD_INTERNAL", label: "BVD Internal" },
  { value: "CLIENT_PRIVATE", label: "Client Private" },
  { value: "CLIENT_SHARED", label: "Client Shared" },
  { value: "PUBLIC", label: "Public" },
];

export function KnowledgeFilters({
  clients,
  sorts,
}: {
  clients: { id: string; label: string }[];
  sorts: { value: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
  }

  const filterKeys = ["tag", "status", "visibility", "client", "ai", "sort"];
  const hasFilters = filterKeys.some((k) => searchParams.get(k));

  function clearFilters() {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of filterKeys) params.delete(key);
    router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        value={searchParams.get("tag") ?? ""}
        onChange={(e) => setParam("tag", e.target.value)}
        placeholder="Filter by tag…"
        className={`${selectClass} w-32`}
        aria-label="Filter by tag"
      />

      <select
        value={searchParams.get("status") ?? ""}
        onChange={(e) => setParam("status", e.target.value)}
        className={selectClass}
        aria-label="Filter by status"
      >
        <option value="">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("visibility") ?? ""}
        onChange={(e) => setParam("visibility", e.target.value)}
        className={selectClass}
        aria-label="Filter by visibility"
      >
        <option value="">All visibilities</option>
        {VISIBILITIES.map((v) => (
          <option key={v.value} value={v.value}>
            {v.label}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("client") ?? ""}
        onChange={(e) => setParam("client", e.target.value)}
        className={selectClass}
        aria-label="Filter by client"
      >
        <option value="">All clients</option>
        <option value="none">No client (internal/public)</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("ai") ?? ""}
        onChange={(e) => setParam("ai", e.target.value)}
        className={selectClass}
        aria-label="Filter by AI-enabled"
      >
        <option value="">AI: all</option>
        <option value="enabled">AI enabled</option>
        <option value="disabled">AI disabled</option>
      </select>

      <select
        value={searchParams.get("sort") ?? "updated"}
        onChange={(e) => setParam("sort", e.target.value)}
        className={selectClass}
        aria-label="Sort articles"
      >
        {sorts.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      {hasFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
