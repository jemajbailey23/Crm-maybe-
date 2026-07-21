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
          <h1 className="text-xl font-semibold text-slate-900">{deal.title}</h1>
          <p className="text-sm text-slate-500">
            {deal.contact && (
              <Link href={`/contacts/${deal.contact.id}`} className="hover:underline">
                {deal.contact.firstName} {deal.contact.lastName}
              </Link>
            )}
            {deal.contact && deal.company && " · "}
            {deal.company && (
              <Link href={`/companies/${deal.company.id}`} className="hover:underline">
                {deal.company.name}
              </Link>
            )}
          </p>
        </div>
        <form action={deleteDealWithId}>
          <ConfirmSubmitButton
            confirmMessage={`Delete "${deal.title}"? This can't be undone.`}
            className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete deal
          </ConfirmSubmitButton>
        </form>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Details</h2>
        <DealForm
          action={updateDealWithId}
          contacts={contacts}
          companies={companies}
          defaultValues={deal}
          submitLabel="Save changes"
        />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Tasks</h2>
        <div className="mb-4">
          <TaskQuickForm dealId={deal.id} />
        </div>
        {deal.tasks.length === 0 ? (
          <p className="text-sm text-slate-500">No tasks yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {deal.tasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between py-2 text-sm">
                <div className="flex items-center gap-2">
                  <form action={toggleTaskStatus.bind(null, task.id, task.status)}>
                    <button
                      type="submit"
                      className={`h-4 w-4 rounded border ${
                        task.status === "DONE"
                          ? "border-slate-900 bg-slate-900"
                          : "border-slate-300 bg-white"
                      }`}
                      aria-label="Toggle task status"
                    />
                  </form>
                  <span
                    className={
                      task.status === "DONE"
                        ? "text-slate-400 line-through"
                        : "text-slate-900"
                    }
                  >
                    {task.title}
                  </span>
                  {task.dueDate && (
                    <span className="text-xs text-slate-400">
                      {formatDate(task.dueDate)}
                    </span>
                  )}
                </div>
                <form action={deleteTask.bind(null, task.id)}>
                  <button
                    type="submit"
                    className="text-xs text-slate-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Activity</h2>
        <div className="mb-4">
          <ActivityQuickForm dealId={deal.id} />
        </div>
        {deal.activities.length === 0 ? (
          <p className="text-sm text-slate-500">No activity logged yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {deal.activities.map((activity) => (
              <li key={activity.id} className="flex items-start justify-between py-2 text-sm">
                <div>
                  <p className="text-slate-900">{activity.summary}</p>
                  <p className="text-xs text-slate-500">
                    {activity.type} · {formatDate(activity.occurredAt)}
                  </p>
                </div>
                <form action={deleteActivity.bind(null, activity.id)}>
                  <button
                    type="submit"
                    className="text-xs text-slate-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
