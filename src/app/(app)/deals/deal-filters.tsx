"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const selectClass =
  "rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const checkboxLabelClass =
  "flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300 shadow-sm";

export function DealFilters({
  stages,
  leadSources,
  services,
  owners,
}: {
  stages: { value: string; label: string }[];
  leadSources: string[];
  services: string[];
  owners: { id: string; name: string }[];
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

  function toggleParam(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get(key) === "1") {
      params.delete(key);
    } else {
      params.set(key, "1");
    }
    router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
  }

  const hasFilters = [
    "stage",
    "leadSource",
    "service",
    "owner",
    "overdue",
    "stale",
    "closeFrom",
    "closeTo",
  ].some((k) => searchParams.get(k));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={searchParams.get("stage") ?? ""}
        onChange={(e) => setParam("stage", e.target.value)}
        className={selectClass}
        aria-label="Filter by stage"
      >
        <option value="">All stages</option>
        {stages.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("leadSource") ?? ""}
        onChange={(e) => setParam("leadSource", e.target.value)}
        className={selectClass}
        aria-label="Filter by lead source"
      >
        <option value="">All lead sources</option>
        {leadSources.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("service") ?? ""}
        onChange={(e) => setParam("service", e.target.value)}
        className={selectClass}
        aria-label="Filter by service"
      >
        <option value="">All services</option>
        {services.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("owner") ?? ""}
        onChange={(e) => setParam("owner", e.target.value)}
        className={selectClass}
        aria-label="Filter by assigned owner"
      >
        <option value="">All owners</option>
        <option value="unassigned">Unassigned</option>
        {owners.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>

      <label className={checkboxLabelClass}>
        <input
          type="checkbox"
          checked={searchParams.get("overdue") === "1"}
          onChange={() => toggleParam("overdue")}
          className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500"
        />
        Overdue follow-up
      </label>

      <label className={checkboxLabelClass}>
        <input
          type="checkbox"
          checked={searchParams.get("stale") === "1"}
          onChange={() => toggleParam("stale")}
          className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500"
        />
        Stale deals
      </label>

      <div className="flex items-center gap-1 text-xs text-zinc-500">
        Close date
        <input
          type="date"
          value={searchParams.get("closeFrom") ?? ""}
          onChange={(e) => setParam("closeFrom", e.target.value)}
          className={selectClass}
          aria-label="Expected close date from"
        />
        <span>–</span>
        <input
          type="date"
          value={searchParams.get("closeTo") ?? ""}
          onChange={(e) => setParam("closeTo", e.target.value)}
          className={selectClass}
          aria-label="Expected close date to"
        />
      </div>

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
