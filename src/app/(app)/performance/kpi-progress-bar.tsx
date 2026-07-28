export function KpiProgressBar({
  label,
  actual,
  target,
  display,
}: {
  label: string;
  actual: number;
  target: number;
  display: string;
}) {
  const percent = target > 0 ? Math.round((actual / target) * 100) : null;
  const width = percent === null ? 0 : Math.min(percent, 100);
  const met = percent !== null && percent >= 100;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="font-medium text-zinc-200">
          {display} {percent !== null && (met ? "· goal met" : `· ${percent}%`)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${
            met
              ? "bg-emerald-500"
              : "bg-linear-to-r from-indigo-500 to-violet-500"
          }`}
          style={{ width: `${percent === null ? 0 : Math.max(width, width > 0 ? 3 : 0)}%` }}
        />
      </div>
    </div>
  );
}
