export function BarChart({
  data,
}: {
  data: { label: string; value: number; display?: string }[];
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label}>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-zinc-400">{d.label}</span>
            <span className="font-medium text-zinc-200">
              {d.display ?? d.value}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-linear-to-r from-indigo-500 to-violet-500 transition-[width] duration-700 ease-out"
              style={{ width: `${Math.max((d.value / max) * 100, d.value > 0 ? 3 : 0)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
