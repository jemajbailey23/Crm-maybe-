import Link from "next/link";
import { ActivityTypeBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

type RecentActivity = {
  id: string;
  type: string;
  summary: string;
  occurredAt: Date;
  contact: { id: string; firstName: string; lastName: string; company: { name: string } | null } | null;
  deal: { title: string; company: { name: string } | null } | null;
  project: { name: string } | null;
};

export function RecentActivityPanel({ activities }: { activities: RecentActivity[] }) {
  return (
    <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-100">Recent activity</h2>
        <Link
          href="/contacts"
          className="text-xs font-medium text-zinc-500 transition-colors hover:text-indigo-400"
        >
          View contacts →
        </Link>
      </div>
      {activities.length === 0 ? (
        <EmptyState message="No activity logged yet." actionLabel="View contacts" actionHref="/contacts" />
      ) : (
        <ul className="divide-y divide-zinc-800/60">
          {activities.map((activity) => {
            const company = activity.contact?.company ?? activity.deal?.company ?? null;
            return (
              <li key={activity.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-zinc-200">{activity.summary}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {activity.contact && (
                      <Link href={`/contacts/${activity.contact.id}`} className="hover:text-indigo-400">
                        {activity.contact.firstName} {activity.contact.lastName}
                      </Link>
                    )}
                    {company && ` · ${company.name}`}
                    {activity.deal && ` · ${activity.deal.title}`}
                    {activity.project && ` · ${activity.project.name}`}
                    {" · "}
                    {formatDate(activity.occurredAt)}
                  </p>
                </div>
                <ActivityTypeBadge type={activity.type} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
