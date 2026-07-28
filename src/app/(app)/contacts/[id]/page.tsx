import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ContactForm } from "../contact-form";
import { updateContact, deleteContact } from "../actions";
import { toggleTaskStatus, deleteTask } from "../../tasks/actions";
import { deleteActivity } from "../../activities/actions";
import { TaskQuickForm } from "../../tasks/task-quick-form";
import { ActivityQuickForm } from "../../activities/activity-quick-form";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { DealStageBadge, ActivityTypeBadge } from "@/components/ui/badge";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [contact, companies] = await Promise.all([
    prisma.contact.findUnique({
      where: { id },
      include: {
        company: true,
        deals: { orderBy: { createdAt: "desc" } },
        tasks: { orderBy: [{ status: "asc" }, { dueDate: "asc" }] },
        activities: { orderBy: { occurredAt: "desc" } },
      },
    }),
    prisma.company.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!contact) notFound();

  const updateContactWithId = updateContact.bind(null, contact.id);
  const deleteContactWithId = deleteContact.bind(null, contact.id);

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            {contact.firstName} {contact.lastName}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {contact.title ? `${contact.title} · ` : ""}
            {contact.company ? (
              <Link
                href={`/companies/${contact.company.id}`}
                className="hover:text-indigo-400"
              >
                {contact.company.name}
              </Link>
            ) : (
              "No company"
            )}
          </p>
        </div>
        <form action={deleteContactWithId}>
          <ConfirmSubmitButton
            confirmMessage={`Delete ${contact.firstName} ${contact.lastName}? This can't be undone.`}
            className="rounded-lg border border-red-500/30 px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
          >
            Delete contact
          </ConfirmSubmitButton>
        </form>
      </div>

      <section className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">Details</h2>
        <ContactForm
          action={updateContactWithId}
          companies={companies}
          defaultValues={contact}
          submitLabel="Save changes"
        />
      </section>

      <section className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-100">Deals</h2>
          <Link
            href={`/deals/new?contactId=${contact.id}`}
            className="text-xs font-medium text-zinc-500 transition-colors hover:text-indigo-400"
          >
            + New deal
          </Link>
        </div>
        {contact.deals.length === 0 ? (
          <p className="text-sm text-zinc-500">No deals for this contact yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {contact.deals.map((deal) => (
              <li key={deal.id} className="flex items-center justify-between py-2.5 text-sm">
                <Link href={`/deals/${deal.id}`} className="font-medium text-zinc-100 hover:text-indigo-400">
                  {deal.title}
                </Link>
                <DealStageBadge stage={deal.stage} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">Tasks</h2>
        <div className="mb-4">
          <TaskQuickForm contactId={contact.id} />
        </div>
        {contact.tasks.length === 0 ? (
          <p className="text-sm text-zinc-500">No tasks yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {contact.tasks.map((task) => (
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
          <ActivityQuickForm contactId={contact.id} />
        </div>
        {contact.activities.length === 0 ? (
          <p className="text-sm text-zinc-500">No activity logged yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {contact.activities.map((activity) => (
              <li key={activity.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="text-zinc-200">{activity.summary}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {formatDate(activity.occurredAt)}
                  </p>
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
