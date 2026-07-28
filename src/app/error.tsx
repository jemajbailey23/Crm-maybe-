"use client";

import { useEffect } from "react";

export default function RootError({
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
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-950 px-4 py-16 text-center">
      <p className="text-sm font-semibold text-zinc-100">
        Something went wrong.
      </p>
      <p className="mt-1 max-w-sm text-sm text-zinc-500">Please try again.</p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-4 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400"
      >
        Try again
      </button>
    </div>
  );
}
