import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DealForm } from "../deal-form";
import { updateDeal, deleteDeal } from "../actions";
import { toggleTaskStatus, deleteTask } from "../../tasks/actions";
import { deleteActivity } from "../../activities/actions";
import { TaskQuickForm } from "../../tasks/task-quick-form";
import { ActivityQuickForm } from "../../activities/activity-quick-form";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { ActivityTypeBadge } from "@/components/ui/badge";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [deal, contacts, companies] = await Promise.all([
    prisma.deal.findUnique({
      where: { id },
      include: {
        contact: true,
        company: true,
        tasks: { orderBy: [{ status: "asc" }, { dueDate: "asc" }] },
        activities: { orderBy: { occurredAt: "desc" } },
      },
    }),
    prisma.contact.findMany({
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.company.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!deal) notFound();

  const updateDealWithId = updateDeal.bind(null, deal.id);
  const deleteDealWithId = deleteDeal.bind(null, deal.id);

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">{deal.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {deal.contact && (
              <Link href={`/contacts/${deal.contact.id}`} className="hover:text-indigo-400">
                {deal.contact.firstName} {deal.contact.lastName}
              </Link>
            )}
            {deal.contact && deal.company && " · "}
            {deal.company && (
              <Link href={`/companies/${deal.company.id}`} className="hover:text-indigo-400">
                {deal.company.name}
              </Link>
            )}
          </p>
        </div>
        <form action={deleteDealWithId}>
          <ConfirmSubmitButton
            confirmMessage={`Delete "${deal.title}"? This can't be undone.`}
            className="rounded-lg border border-red-500/30 px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
          >
            Delete deal
          </ConfirmSubmitButton>
        </form>
      </div>

      <section className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">Details</h2>
        <DealForm
          action={updateDealWithId}
          contacts={contacts}
          companies={companies}
          defaultValues={deal}
          submitLabel="Save changes"
        />
      </section>

      <section className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">Tasks</h2>
        <div className="mb-4">
          <TaskQuickForm dealId={deal.id} />
        </div>
        {deal.tasks.length === 0 ? (
          <p className="text-sm text-zinc-500">No tasks yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {deal.tasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between py-2.5 text-sm">
                <div className="flex items-center gap-2.5">
                  <form action={toggleTaskStatus.bind(null, task.id, task.status)}>
                    <button
                      type="submit"
                      className={`h-4 w-4 rounded border transition-colors ${
                        task.status === "DONE"
                          ? "border-indigo-500 bg-indigo-500"
                          : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"
                      }`}
                      aria-label="Toggle task status"
                    />
                  </form>
                  <span
                    className={
                      task.status === "DONE"
                        ? "text-zinc-500 line-through"
                        : "text-zinc-200"
                    }
                  >
                    {task.title}
                  </span>
                  {task.dueDate && (
                    <span className="text-xs text-zinc-500">
                      {formatDate(task.dueDate)}
                    </span>
                  )}
                </div>
                <form action={deleteTask.bind(null, task.id)}>
                  <button
                    type="submit"
                    className="text-xs text-zinc-600 transition-colors hover:text-red-400"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">Activity</h2>
        <div className="mb-4">
          <ActivityQuickForm dealId={deal.id} />
        </div>
        {deal.activities.length === 0 ? (
          <p className="text-sm text-zinc-500">No activity logged yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {deal.activities.map((activity) => (
              <li key={activity.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="text-zinc-200">{activity.summary}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{formatDate(activity.occurredAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <ActivityTypeBadge type={activity.type} />
                  <form action={deleteActivity.bind(null, activity.id)}>
                    <button
                      type="submit"
                      className="text-xs text-zinc-600 transition-colors hover:text-red-400"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
