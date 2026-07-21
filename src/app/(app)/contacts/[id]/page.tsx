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
          <h1 className="text-xl font-semibold text-slate-900">
            {contact.firstName} {contact.lastName}
          </h1>
          <p className="text-sm text-slate-500">
            {contact.title ? `${contact.title} · ` : ""}
            {contact.company ? (
              <Link
                href={`/companies/${contact.company.id}`}
                className="hover:underline"
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
            className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete contact
          </ConfirmSubmitButton>
        </form>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Details</h2>
        <ContactForm
          action={updateContactWithId}
          companies={companies}
          defaultValues={contact}
          submitLabel="Save changes"
        />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Deals</h2>
          <Link
            href={`/deals/new?contactId=${contact.id}`}
            className="text-xs font-medium text-slate-500 hover:text-slate-900"
          >
            + New deal
          </Link>
        </div>
        {contact.deals.length === 0 ? (
          <p className="text-sm text-slate-500">No deals for this contact yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {contact.deals.map((deal) => (
              <li key={deal.id} className="flex items-center justify-between py-2 text-sm">
                <Link href={`/deals/${deal.id}`} className="font-medium text-slate-900 hover:underline">
                  {deal.title}
                </Link>
                <span className="text-xs text-slate-500">{deal.stage}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Tasks</h2>
        <div className="mb-4">
          <TaskQuickForm contactId={contact.id} />
        </div>
        {contact.tasks.length === 0 ? (
          <p className="text-sm text-slate-500">No tasks yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {contact.tasks.map((task) => (
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
          <ActivityQuickForm contactId={contact.id} />
        </div>
        {contact.activities.length === 0 ? (
          <p className="text-sm text-slate-500">No activity logged yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {contact.activities.map((activity) => (
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
