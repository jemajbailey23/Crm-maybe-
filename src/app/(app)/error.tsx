"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50 px-6 py-16 text-center">
      <p className="text-sm font-semibold text-zinc-100">
        Something went wrong.
      </p>
      <p className="mt-1 max-w-sm text-sm text-zinc-500">
        This page hit an unexpected error. You can try again, or head back to
        the dashboard.
      </p>
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400"
        >
          Try again
        </button>
        <a
          href="/dashboard"
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
        >
          Go to dashboard
        </a>
      </div>
    </div>
  );
}
