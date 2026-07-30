import Link from "next/link";

export function EmptyState({
  message,
  actionLabel,
  actionHref,
}: {
  message: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="text-sm text-zinc-500">
      <p>{message}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-1.5 inline-block font-medium text-indigo-400 transition-colors hover:text-indigo-300"
        >
          {actionLabel} →
        </Link>
      )}
    </div>
  );
}
