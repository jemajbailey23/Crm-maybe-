"use client";

import { useState, useTransition } from "react";
import { updateTaskProgress } from "./actions";

export function TaskProgressControl({
  taskId,
  progress,
}: {
  taskId: string;
  progress: number;
}) {
  const [value, setValue] = useState(progress);
  const [isPending, startTransition] = useTransition();

  const commit = (next: number) => {
    startTransition(() => {
      updateTaskProgress(taskId, next);
    });
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs text-zinc-500">
        <span>Completion</span>
        <span className="font-medium text-zinc-300">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        disabled={isPending}
        onChange={(e) => setValue(Number(e.target.value))}
        onMouseUp={(e) => commit(Number(e.currentTarget.value))}
        onTouchEnd={(e) => commit(Number(e.currentTarget.value))}
        className="w-full accent-indigo-500"
      />
    </div>
  );
}
