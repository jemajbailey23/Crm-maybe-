import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/stat-card";
import { BarChart } from "@/components/ui/bar-chart";
import { TaskStatusBadge, ActivityTypeBadge } from "@/components/ui/badge";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

const STAGES: { value: string; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "PROPOSAL", label: "Proposal" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
];

export default async function DashboardPage() {
  const [contactCount, allDeals, openTaskCount, openTasks, recentActivities] =
    await Promise.all([
      prisma.contact.count(),
      prisma.deal.findMany({ select: { stage: true, value: true } }),
      prisma.task.count({ where: { status: "OPEN" } }),
      prisma.task.findMany({
        where: { status: "OPEN" },
        orderBy: { dueDate: "asc" },
        take: 5,
        include: { contact: true, deal: true },
      }),
      prisma.activity.findMany({
        orderBy: { occurredAt: "desc" },
        take: 5,
        include: { contact: true, deal: true },
      }),
    ]);

  const openDeals = allDeals.filter((d) => d.stage !== "WON" && d.stage !== "LOST");
  const pipelineValue = openDeals.reduce((sum, deal) => sum + (deal.value ?? 0), 0);
  const wonDeals = allDeals.filter((d) => d.stage === "WON");
  const closedDeals = allDeals.filter((d) => d.stage === "WON" || d.stage === "LOST");
  const winRate = closedDeals.length > 0 ? Math.round((wonDeals.length / closedDeals.length) * 100) : null;

  const stageData = STAGES.map((s) => ({
    label: s.label,
    value: allDeals.filter((d) => d.stage === s.value).length,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Overview of contacts, pipeline, and follow-ups.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Contacts" value={String(contactCount)} />
        <StatCard label="Open deals" value={String(openDeals.length)} />
        <StatCard
          label="Open pipeline value"
          value={formatCurrency(pipelineValue)}
        />
        <StatCard
          label="Win rate"
          value={winRate === null ? "—" : `${winRate}%`}
          sub={closedDeals.length > 0 ? `${wonDeals.length} of ${closedDeals.length} closed` : "No closed deals yet"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-100">
              Pipeline by stage
            </h2>
            <Link
              href="/deals"
              className="text-xs font-medium text-zinc-500 transition-colors hover:text-indigo-400"
            >
              View pipeline →
            </Link>
          </div>
          {allDeals.length === 0 ? (
            <p className="text-sm text-zinc-500">No deals yet.</p>
          ) : (
            <BarChart data={stageData} />
          )}
        </div>

        <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-100">
              Upcoming tasks
              {openTaskCount > 0 && (
                <span className="ml-2 rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400">
                  {openTaskCount}
                </span>
              )}
            </h2>
            <Link
              href="/tasks"
              className="text-xs font-medium text-zinc-500 transition-colors hover:text-indigo-400"
            >
              View all →
            </Link>
          </div>
          {openTasks.length === 0 ? (
            <p className="text-sm text-zinc-500">No open tasks. Nice.</p>
          ) : (
            <ul className="divide-y divide-zinc-800/60">
              {openTasks.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-200">{task.title}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {task.dueDate ? `Due ${formatDate(task.dueDate)}` : "No due date"}
                      {task.contact && ` · ${task.contact.firstName} ${task.contact.lastName}`}
                      {task.deal && ` · ${task.deal.title}`}
                    </p>
                  </div>
                  <TaskStatusBadge status={task.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">
          Recent activity
        </h2>
        {recentActivities.length === 0 ? (
          <p className="text-sm text-zinc-500">No activity logged yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {recentActivities.map((activity) => (
              <li key={activity.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-zinc-200">{activity.summary}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {activity.contact && `${activity.contact.firstName} ${activity.contact.lastName}`}
                    {activity.deal && ` · ${activity.deal.title}`}
                    {" · "}
                    {formatDate(activity.occurredAt)}
                  </p>
                </div>
                <ActivityTypeBadge type={activity.type} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
