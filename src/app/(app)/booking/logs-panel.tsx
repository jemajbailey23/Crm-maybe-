const TYPE_LABELS: Record<string, string> = {
  CONFIRMATION_SENT: "Confirmation sent",
  REMINDER_SENT: "Reminder sent",
  DELIVERY_FAILED: "Delivery failed",
  BOOKING_CONFLICT: "Booking conflict",
  DUPLICATE_PREVENTED: "Duplicate prevented",
};

const TYPE_COLOR: Record<string, string> = {
  CONFIRMATION_SENT: "text-emerald-400",
  REMINDER_SENT: "text-blue-400",
  DELIVERY_FAILED: "text-red-400",
  BOOKING_CONFLICT: "text-amber-400",
  DUPLICATE_PREVENTED: "text-zinc-400",
};

function formatLogDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

export function LogsPanel({ logs }: { logs: { id: string; type: string; message: string; createdAt: Date }[] }) {
  if (logs.length === 0) {
    return <p className="text-sm text-zinc-500">No booking activity logged yet.</p>;
  }
  return (
    <ul className="space-y-3">
      {logs.map((log) => (
        <li key={log.id} className="min-w-0 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`shrink-0 text-xs font-medium ${TYPE_COLOR[log.type] ?? "text-zinc-400"}`}>
              {TYPE_LABELS[log.type] ?? log.type}
            </span>
            <span className="shrink-0 text-xs text-zinc-600">{formatLogDate(log.createdAt)}</span>
          </div>
          {/* break-words is load-bearing here — log messages can contain
              long unbroken tokens (email addresses, record IDs) that would
              otherwise force the whole row (and page) wider than the
              viewport on mobile. */}
          <p className="mt-0.5 min-w-0 break-words text-zinc-500">{log.message}</p>
        </li>
      ))}
    </ul>
  );
}
