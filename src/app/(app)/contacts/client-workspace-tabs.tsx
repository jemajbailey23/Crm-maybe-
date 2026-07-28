"use client";

import { useState } from "react";

export function ClientWorkspaceTabs({
  tabs,
}: {
  tabs: { id: string; label: string; badge?: number; content: React.ReactNode }[];
}) {
  const [active, setActive] = useState(tabs[0]?.id);

  return (
    <div>
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-zinc-800 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              active === tab.id
                ? "border-indigo-500 text-zinc-100"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.label}
            {!!tab.badge && (
              <span className="ml-1.5 rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          data-tab-panel={tab.id}
          hidden={tab.id !== active}
          className={tab.id === active ? "animate-fade-in" : undefined}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
