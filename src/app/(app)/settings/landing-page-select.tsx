"use client";

import { useState, useTransition } from "react";
import { updateDefaultLandingPage } from "./actions";

const OPTIONS = [
  { value: "/dashboard", label: "Dashboard" },
  { value: "/tasks", label: "Tasks" },
  { value: "/performance", label: "CEO Dashboard" },
  { value: "/deals", label: "Pipeline" },
  { value: "/projects", label: "Projects" },
];

export function LandingPageSelect({ current }: { current: string }) {
  const [value, setValue] = useState(current);
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={value}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value;
        setValue(next);
        startTransition(() => {
          updateDefaultLandingPage(next);
        });
      }}
      className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
