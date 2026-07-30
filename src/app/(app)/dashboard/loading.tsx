function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/50 ${className}`}
    />
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="h-7 w-40 animate-pulse rounded bg-zinc-800/60" />
        <div className="h-4 w-64 animate-pulse rounded bg-zinc-800/40" />
      </div>

      <SkeletonCard className="h-40" />

      <div className="flex flex-wrap gap-2">
        <div className="h-10 w-32 animate-pulse rounded-xl bg-zinc-800/60" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 w-28 animate-pulse rounded-lg bg-zinc-800/40" />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <SkeletonCard key={i} className="h-20" />
        ))}
      </div>

      <SkeletonCard className="h-64" />
      <SkeletonCard className="h-48" />
      <SkeletonCard className="h-48" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SkeletonCard className="h-56" />
        <SkeletonCard className="h-56" />
      </div>
    </div>
  );
}
