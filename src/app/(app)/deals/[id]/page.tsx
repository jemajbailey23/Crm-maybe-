import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DealForm } from "../deal-form";
import { updateDeal, deleteDeal } from "../actions";
import { deleteActivity } from "../../activities/actions";
import { TaskQuickForm } from "../../tasks/task-quick-form";
import { TaskRow } from "../../tasks/task-row";
import { ActivityQuickForm } from "../../activities/activity-quick-form";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { ActivityTypeBadge } from "@/components/ui/badge";
import { getStageLabels, stageOptions } from "@/lib/pipeline-stages";
import { daysInStage, getDealWarnings } from "../deal-rules";

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

  const [deal, contacts, companies, stageLabels, users, serviceTypes] = await Promise.all([
    prisma.deal.findUnique({
      where: { id },
      include: {
        contact: true,
        company: true,
        assignedTo: { select: { id: true, name: true } },
        tasks: {
          orderBy: [{ status: "asc" }, { dueDate: "asc" }],
          include: { contact: true, company: true, deal: true, project: true, invoice: true },
        },
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
    getStageLabels(),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.serviceType.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
  ]);

  if (!deal) notFound();

  const now = new Date();
  const hasBooking = deal.contactId
    ? (await prisma.booking.findFirst({ where: { contactId: deal.contactId }, select: { id: true } })) !== null
    : false;
  const lastActivityAt = deal.activities[0]?.occurredAt ?? null;
  const dealAge = daysInStage(deal.stageEnteredAt, now);
  const warnings = getDealWarnings(deal, lastActivityAt, hasBooking, now);

  const updateDealWithId = updateDeal.bind(null, deal.id);
  const deleteDealWithId = deleteDeal.bind(null, deal.id);

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 break-words">{deal.title}</h1>
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

      <section className="animate-slide-up flex flex-wrap gap-x-6 gap-y-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm">
        <div>
          <span className="text-zinc-500">Days in stage: </span>
          <span className="font-medium text-zinc-200">{dealAge}</span>
        </div>
        <div>
          <span className="text-zinc-500">Last activity: </span>
          <span className="font-medium text-zinc-200">
            {lastActivityAt ? formatDate(lastActivityAt) : "None logged"}
          </span>
        </div>
        {deal.assignedTo && (
          <div>
            <span className="text-zinc-500">Owner: </span>
            <span className="font-medium text-zinc-200">{deal.assignedTo.name}</span>
          </div>
        )}
        {warnings.length > 0 && (
          <div className="flex w-full flex-wrap gap-1.5 pt-1">
            {warnings.map((w) => (
              <span
                key={w.code}
                className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400 ring-1 ring-inset ring-amber-500/20"
              >
                {w.label}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">Details</h2>
        <DealForm
          action={updateDealWithId}
          contacts={contacts}
          companies={companies}
          users={users}
          serviceTypes={serviceTypes.map((s) => s.name)}
          stages={stageOptions(stageLabels)}
          defaultValues={deal}
          submitLabel="Save changes"
        />
      </section>

      <section className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">Tasks</h2>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <TaskQuickForm dealId={deal.id} />
          <Link
            href={`/tasks/new?dealId=${deal.id}`}
            className="shrink-0 text-xs font-medium text-zinc-500 transition-colors hover:text-indigo-400"
          >
            Full task form →
          </Link>
        </div>
        {deal.tasks.length === 0 ? (
          <p className="text-sm text-zinc-500">No tasks yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {deal.tasks.map((task) => (
              <TaskRow key={task.id} task={task} hideRelation="deal" now={now} />
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
                    <ConfirmSubmitButton
                      confirmMessage="Delete this activity log entry?"
                      className="text-xs text-zinc-600 transition-colors hover:text-red-400"
                    >
                      Remove
                    </ConfirmSubmitButton>
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
