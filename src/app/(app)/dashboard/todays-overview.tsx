import Link from "next/link";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PriorityBadge } from "@/components/ui/badge";
import { TaskStatusSelect } from "../tasks/task-status-select";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

type TodaysTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  contact: { firstName: string; lastName: string } | null;
  deal: { title: string } | null;
  project: { name: string } | null;
};

export function TodaysOverview({
  newLeadsToday,
  followUpsDue,
  meetingsScheduledToday,
  openTaskCount,
  overdueTaskCount,
  callsScheduledToday,
  projectsOnHold,
  todaysTasks,
  startOfToday,
  blockedTaskCount,
  waitingTaskCount,
  reviewTaskCount,
}: {
  newLeadsToday: number;
  followUpsDue: number;
  meetingsScheduledToday: number;
  openTaskCount: number;
  overdueTaskCount: number;
  callsScheduledToday: number;
  projectsOnHold: number;
  todaysTasks: TodaysTask[];
  startOfToday: Date;
  blockedTaskCount: number;
  waitingTaskCount: number;
  reviewTaskCount: number;
}) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-zinc-100">Today&apos;s overview</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard compact label="New leads" value={String(newLeadsToday)} href="/contacts?status=LEAD" />
        <StatCard compact label="Follow-ups due" value={String(followUpsDue)} href="/tasks" />
        <StatCard compact label="Meetings today" value={String(meetingsScheduledToday)} href="/booking" />
        <StatCard compact label="Tasks due" value={String(openTaskCount)} href="/tasks" />
        <StatCard compact label="Overdue tasks" value={String(overdueTaskCount)} href="/tasks?view=overdue" />
        <StatCard compact label="Blocked tasks" value={String(blockedTaskCount)} href="/tasks?view=blocked" />
        <StatCard compact label="Waiting on client" value={String(waitingTaskCount)} href="/tasks?view=waiting" />
        <StatCard compact label="Awaiting review" value={String(reviewTaskCount)} href="/tasks?view=review" />
        <StatCard compact label="Calls logged" value={String(callsScheduledToday)} />
        <StatCard compact label="Projects on hold" value={String(projectsOnHold)} href="/projects" />
      </div>

      <div className="mt-4 animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-100">
            Today&apos;s tasks
            {todaysTasks.length > 0 && (
              <span className="ml-2 rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400">
                {todaysTasks.length}
              </span>
            )}
          </h3>
          <Link
            href="/tasks"
            className="text-xs font-medium text-zinc-500 transition-colors hover:text-indigo-400"
          >
            View all →
          </Link>
        </div>
        {todaysTasks.length === 0 ? (
          <EmptyState message="Nothing due today. Nice." actionLabel="Add a task" actionHref="/tasks" />
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {todaysTasks.map((task) => (
              <li key={task.id} className="flex items-center gap-2.5 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/tasks/${task.id}`}
                      className="truncate font-medium text-zinc-200 hover:text-indigo-400"
                    >
                      {task.title}
                    </Link>
                    <PriorityBadge priority={task.priority} />
                  </div>
                  <p className="truncate text-xs text-zinc-500">
                    {task.dueDate && task.dueDate < startOfToday
                      ? `Overdue since ${formatDate(task.dueDate)}`
                      : "Due today"}
                    {task.contact && ` · ${task.contact.firstName} ${task.contact.lastName}`}
                    {task.deal && ` · ${task.deal.title}`}
                    {task.project && ` · ${task.project.name}`}
                  </p>
                </div>
                <div className="shrink-0">
                  <TaskStatusSelect taskId={task.id} status={task.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
