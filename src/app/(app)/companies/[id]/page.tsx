import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CompanyForm } from "../company-form";
import { updateCompany, deleteCompany } from "../actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { DealStageBadge } from "@/components/ui/badge";
import { getStageLabels } from "@/lib/pipeline-stages";
import { TaskQuickForm } from "../../tasks/task-quick-form";
import { TaskRow } from "../../tasks/task-row";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const stageLabels = await getStageLabels();

  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: { createdAt: "desc" } },
      deals: { orderBy: { createdAt: "desc" } },
      tasks: {
        orderBy: [{ status: "asc" }, { dueDate: "asc" }],
        include: { contact: true, company: true, deal: true, project: true, invoice: true },
      },
    },
  });

  if (!company) notFound();

  const updateCompanyWithId = updateCompany.bind(null, company.id);
  const deleteCompanyWithId = deleteCompany.bind(null, company.id);

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            {company.name}
          </h1>
          {company.website && (
            <p className="mt-1 text-sm text-zinc-500">{company.website}</p>
          )}
        </div>
        <form action={deleteCompanyWithId}>
          <ConfirmSubmitButton
            confirmMessage={`Delete ${company.name}? This can't be undone.`}
            className="rounded-lg border border-red-500/30 px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
          >
            Delete company
          </ConfirmSubmitButton>
        </form>
      </div>

      <section className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">Details</h2>
        <CompanyForm
          action={updateCompanyWithId}
          defaultValues={company}
          submitLabel="Save changes"
        />
      </section>

      <section className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-100">Contacts</h2>
          <Link
            href={`/contacts/new?companyId=${company.id}`}
            className="text-xs font-medium text-zinc-500 transition-colors hover:text-indigo-400"
          >
            + New contact
          </Link>
        </div>
        {company.contacts.length === 0 ? (
          <p className="text-sm text-zinc-500">No contacts at this company yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {company.contacts.map((contact) => (
              <li key={contact.id} className="py-2.5 text-sm">
                <Link
                  href={`/contacts/${contact.id}`}
                  className="font-medium text-zinc-100 hover:text-indigo-400"
                >
                  {contact.firstName} {contact.lastName}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-100">Deals</h2>
          <Link
            href={`/deals/new?companyId=${company.id}`}
            className="text-xs font-medium text-zinc-500 transition-colors hover:text-indigo-400"
          >
            + New deal
          </Link>
        </div>
        {company.deals.length === 0 ? (
          <p className="text-sm text-zinc-500">No deals for this company yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {company.deals.map((deal) => (
              <li key={deal.id} className="flex items-center justify-between py-2.5 text-sm">
                <Link href={`/deals/${deal.id}`} className="font-medium text-zinc-100 hover:text-indigo-400">
                  {deal.title}
                </Link>
                <DealStageBadge stage={deal.stage} label={stageLabels[deal.stage]} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">Tasks</h2>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <TaskQuickForm companyId={company.id} />
          <Link
            href={`/tasks/new?companyId=${company.id}`}
            className="shrink-0 text-xs font-medium text-zinc-500 transition-colors hover:text-indigo-400"
          >
            Full task form →
          </Link>
        </div>
        {company.tasks.length === 0 ? (
          <p className="text-sm text-zinc-500">No tasks yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {company.tasks.map((task) => (
              <TaskRow key={task.id} task={task} hideRelation="company" now={new Date()} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
