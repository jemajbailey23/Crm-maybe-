import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { startOfDayInZone, endOfDayInZone } from "@/lib/timezone";
import { TaskQuickForm } from "./task-quick-form";
import { TaskRow, type TaskRowData } from "./task-row";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

type ViewKey =
  | "active"
  | "today"
  | "overdue"
  | "upcoming"
  | "by-client"
  | "by-project"
  | "by-deal"
  | "waiting"
  | "blocked"
  | "review"
  | "completed";

const VIEWS: { key: ViewKey; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "today", label: "Today" },
  { key: "overdue", label: "Overdue" },
  { key: "upcoming", label: "Upcoming" },
  { key: "by-client", label: "By Client" },
  { key: "by-project", label: "By Project" },
  { key: "by-deal", label: "By Deal" },
  { key: "waiting", label: "Waiting" },
  { key: "blocked", label: "Blocked" },
  { key: "review", label: "Review" },
  { key: "completed", label: "Completed" },
];

const PRIORITY_RANK: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

function byPriorityThenDue(a: TaskRowData, b: TaskRowData) {
  const rankDiff = (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
  if (rankDiff !== 0) return rankDiff;
  const aTime = a.dueDate?.getTime() ?? Infinity;
  const bTime = b.dueDate?.getTime() ?? Infinity;
  return aTime - bTime;
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; filter?: string }>;
}) {
  const user = await requireUser();
  const { view: rawView, filter } = await searchParams;

  const now = new Date();
  const startOfToday = startOfDayInZone(now, user.bookingTimezone);
  const endOfToday = endOfDayInZone(now, user.bookingTimezone);

  const tasks = await prisma.task.findMany({
    orderBy: [{ dueDate: "asc" }],
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, businessName: true } },
      company: { select: { id: true, name: true } },
      deal: { select: { id: true, title: true } },
      project: { select: { id: true, name: true } },
      invoice: { select: { id: true, description: true } },
    },
  });

  const isOpen = (t: (typeof tasks)[number]) => t.status !== "COMPLETED" && t.status !== "CANCELLED";
  const isActive = (t: (typeof tasks)[number]) => t.status !== "COMPLETED";

  const buckets: Record<ViewKey, typeof tasks> = {
    active: tasks.filter(isActive),
    today: tasks.filter((t) => isOpen(t) && t.dueDate && t.dueDate >= startOfToday && t.dueDate <= endOfToday),
    overdue: tasks.filter((t) => isOpen(t) && t.dueDate && t.dueDate < startOfToday),
    upcoming: tasks.filter((t) => isOpen(t) && t.dueDate && t.dueDate > endOfToday),
    "by-client": tasks.filter((t) => isOpen(t) && t.contact),
    "by-project": tasks.filter((t) => isOpen(t) && t.project),
    "by-deal": tasks.filter((t) => isOpen(t) && t.deal),
    waiting: tasks.filter((t) => t.status === "WAITING"),
    blocked: tasks.filter((t) => t.status === "BLOCKED"),
    review: tasks.filter((t) => t.status === "REVIEW"),
    completed: tasks
      .filter((t) => t.status === "COMPLETED")
      .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0)),
  };

  for (const key of ["active", "today", "overdue", "upcoming", "waiting", "blocked", "review"] as ViewKey[]) {
    buckets[key].sort(byPriorityThenDue);
  }

  // Legacy `?filter=overdue` link (dashboard, older bookmarks) — treat as
  // the Overdue view so it keeps working.
  const view: ViewKey = filter === "overdue" ? "overdue" : VIEWS.some((v) => v.key === rawView) ? (rawView as ViewKey) : "active";
  const activeTasks = buckets[view];
  const doneCount = buckets.completed.length;
  const progress = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  const isGrouped = view === "by-client" || view === "by-project" || view === "by-deal";
  const groups = isGrouped ? groupTasks(activeTasks, view) : null;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Tasks</h1>
          <p className="mt-1 text-sm text-zinc-500">Follow-ups across every contact, deal, and project.</p>
        </div>
        <Link
          href="/tasks/new"
          className="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
        >
          Full task form
        </Link>
      </div>

      {tasks.length > 0 && (
        <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-zinc-400">
              {doneCount} of {tasks.length} complete
            </span>
            <span className="font-medium text-zinc-300">{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-linear-to-r from-indigo-500 to-violet-500 transition-[width] duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <TaskQuickForm />
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-zinc-800 pb-3">
        {VIEWS.map((v) => {
          const count = buckets[v.key].length;
          const isViewActive = v.key === view;
          return (
            <Link
              key={v.key}
              href={`/tasks?view=${v.key}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                isViewActive
                  ? "bg-indigo-500/15 text-indigo-400"
                  : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
              }`}
            >
              {v.label}
              {count > 0 && (
                <span className="ml-1.5 rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        {isGrouped && groups ? (
          groups.length === 0 ? (
            <EmptyState message={emptyMessage(view)} />
          ) : (
            <div className="space-y-6">
              {groups.map((group) => (
                <div key={group.key}>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-100">
                    {group.href ? (
                      <Link href={group.href} className="hover:text-indigo-400">
                        {group.label}
                      </Link>
                    ) : (
                      group.label
                    )}
                    <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                      {group.tasks.length}
                    </span>
                  </h3>
                  <ul className="divide-y divide-zinc-800/60">
                    {group.tasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        hideRelation={view === "by-client" ? "contact" : view === "by-project" ? "project" : "deal"}
                        now={now}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )
        ) : activeTasks.length === 0 ? (
          <EmptyState message={emptyMessage(view)} />
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {activeTasks.map((task) => (
              <TaskRow key={task.id} task={task} now={now} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function groupTasks(tasks: TaskRowData[], view: "by-client" | "by-project" | "by-deal") {
  const map = new Map<string, { key: string; label: string; href?: string; tasks: TaskRowData[] }>();
  for (const task of tasks) {
    let key: string | null = null;
    let label = "";
    let href: string | undefined;
    if (view === "by-client" && task.contact) {
      key = task.contact.id;
      label = task.contact.businessName || `${task.contact.firstName} ${task.contact.lastName}`;
      href = `/contacts/${task.contact.id}`;
    } else if (view === "by-project" && task.project) {
      key = task.project.id;
      label = task.project.name;
      href = `/projects/${task.project.id}`;
    } else if (view === "by-deal" && task.deal) {
      key = task.deal.id;
      label = task.deal.title;
      href = `/deals/${task.deal.id}`;
    }
    if (!key) continue;
    const group = map.get(key) ?? { key, label, href, tasks: [] };
    group.tasks.push(task);
    map.set(key, group);
  }
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
}

function emptyMessage(view: ViewKey) {
  switch (view) {
    case "active":
      return "Nothing open. Nice.";
    case "today":
      return "Nothing due today.";
    case "overdue":
      return "Nothing overdue. Nice.";
    case "upcoming":
      return "No upcoming tasks.";
    case "by-client":
      return "No tasks linked to a client.";
    case "by-project":
      return "No tasks linked to a project.";
    case "by-deal":
      return "No tasks linked to a deal.";
    case "waiting":
      return "Nothing waiting on someone else.";
    case "blocked":
      return "Nothing blocked. Nice.";
    case "review":
      return "Nothing awaiting review.";
    case "completed":
      return "No completed tasks yet.";
  }
}
