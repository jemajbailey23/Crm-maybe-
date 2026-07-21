import Link from "next/link";
import { prisma } from "@/lib/prisma";

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

export default async function DashboardPage() {
  const [contactCount, openDeals, openTasks, recentActivities] =
    await Promise.all([
      prisma.contact.count(),
      prisma.deal.findMany({
        where: { stage: { notIn: ["WON", "LOST"] } },
        select: { value: true },
      }),
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

  const pipelineValue = openDeals.reduce(
    (sum, deal) => sum + (deal.value ?? 0),
    0
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Overview of contacts, pipeline, and follow-ups.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-slate-500">
            Contacts
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {contactCount}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-slate-500">
            Open deals
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {openDeals.length}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-slate-500">
            Open pipeline value
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {formatCurrency(pipelineValue)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Upcoming tasks
            </h2>
            <Link
              href="/tasks"
              className="text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              View all
            </Link>
          </div>
          {openTasks.length === 0 ? (
            <p className="text-sm text-slate-500">No open tasks. Nice.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {openTasks.map((task) => (
                <li key={task.id} className="py-2 text-sm">
                  <p className="font-medium text-slate-900">{task.title}</p>
                  <p className="text-xs text-slate-500">
                    {task.dueDate
                      ? `Due ${formatDate(task.dueDate)}`
                      : "No due date"}
                    {task.contact &&
                      ` · ${task.contact.firstName} ${task.contact.lastName}`}
                    {task.deal && ` · ${task.deal.title}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Recent activity
          </h2>
          {recentActivities.length === 0 ? (
            <p className="text-sm text-slate-500">No activity logged yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentActivities.map((activity) => (
                <li key={activity.id} className="py-2 text-sm">
                  <p className="font-medium text-slate-900">
                    {activity.summary}
                  </p>
                  <p className="text-xs text-slate-500">
                    {activity.type}
                    {activity.contact &&
                      ` · ${activity.contact.firstName} ${activity.contact.lastName}`}
                    {activity.deal && ` · ${activity.deal.title}`}
                    {" · "}
                    {formatDate(activity.occurredAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
