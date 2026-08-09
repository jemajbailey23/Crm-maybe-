"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const selectClass =
  "rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

const HEALTHS = [
  { value: "ON_TRACK", label: "On track" },
  { value: "NEEDS_ATTENTION", label: "Needs attention" },
  { value: "AT_RISK", label: "At risk" },
  { value: "BLOCKED", label: "Blocked" },
];

export function ProjectFilters({
  owners,
  companies,
}: {
  owners: { id: string; name: string }[];
  companies: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
  }

  const hasFilters = ["owner", "company", "health"].some((k) => searchParams.get(k));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={searchParams.get("owner") ?? ""}
        onChange={(e) => setParam("owner", e.target.value)}
        className={selectClass}
        aria-label="Filter by owner"
      >
        <option value="">All owners</option>
        <option value="unassigned">Unassigned</option>
        {owners.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("company") ?? ""}
        onChange={(e) => setParam("company", e.target.value)}
        className={selectClass}
        aria-label="Filter by client company"
      >
        <option value="">All companies</option>
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("health") ?? ""}
        onChange={(e) => setParam("health", e.target.value)}
        className={selectClass}
        aria-label="Filter by health"
      >
        <option value="">All health</option>
        {HEALTHS.map((h) => (
          <option key={h.value} value={h.value}>
            {h.label}
          </option>
        ))}
      </select>

      {hasFilters && (
        <button
          type="button"
          onClick={() => router.replace(pathname)}
          className="text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
