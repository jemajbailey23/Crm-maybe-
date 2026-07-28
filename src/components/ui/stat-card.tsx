export function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="group animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition-colors duration-200 hover:border-zinc-700 hover:bg-zinc-900">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {label}
        </p>
        {icon && (
          <span className="text-zinc-600 transition-colors group-hover:text-indigo-400">
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}
