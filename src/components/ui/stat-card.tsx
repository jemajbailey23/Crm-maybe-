import Link from "next/link";

export function StatCard({
  label,
  value,
  sub,
  icon,
  href,
  compact = false,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  href?: string;
  compact?: boolean;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between">
        <p
          className={`font-medium uppercase tracking-wide text-zinc-500 ${
            compact ? "text-[10px]" : "text-xs"
          }`}
        >
          {label}
        </p>
        {icon && (
          <span className="text-zinc-600 transition-colors group-hover:text-indigo-400">
            {icon}
          </span>
        )}
      </div>
      <p
        className={`font-semibold tracking-tight text-zinc-50 ${
          compact ? "mt-1 text-xl" : "mt-2 text-3xl"
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-1 truncate text-xs text-zinc-500">{sub}</p>}
    </>
  );

  const className = `group animate-slide-up block rounded-xl border border-zinc-800 bg-zinc-900/50 transition-colors duration-200 hover:bg-zinc-900 ${
    compact ? "p-3" : "p-5"
  } ${href ? "hover:border-indigo-500/40" : "hover:border-zinc-700"}`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
