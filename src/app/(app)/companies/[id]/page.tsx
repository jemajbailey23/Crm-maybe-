import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CompanyForm } from "../company-form";
import { updateCompany, deleteCompany } from "../actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: { createdAt: "desc" } },
      deals: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!company) notFound();

  const updateCompanyWithId = updateCompany.bind(null, company.id);
  const deleteCompanyWithId = deleteCompany.bind(null, company.id);

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {company.name}
          </h1>
          {company.website && (
            <p className="text-sm text-slate-500">{company.website}</p>
          )}
        </div>
        <form action={deleteCompanyWithId}>
          <ConfirmSubmitButton
            confirmMessage={`Delete ${company.name}? This can't be undone.`}
            className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete company
          </ConfirmSubmitButton>
        </form>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Details</h2>
        <CompanyForm
          action={updateCompanyWithId}
          defaultValues={company}
          submitLabel="Save changes"
        />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Contacts</h2>
          <Link
            href={`/contacts/new?companyId=${company.id}`}
            className="text-xs font-medium text-slate-500 hover:text-slate-900"
          >
            + New contact
          </Link>
        </div>
        {company.contacts.length === 0 ? (
          <p className="text-sm text-slate-500">No contacts at this company yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {company.contacts.map((contact) => (
              <li key={contact.id} className="py-2 text-sm">
                <Link
                  href={`/contacts/${contact.id}`}
                  className="font-medium text-slate-900 hover:underline"
                >
                  {contact.firstName} {contact.lastName}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Deals</h2>
          <Link
            href={`/deals/new?companyId=${company.id}`}
            className="text-xs font-medium text-slate-500 hover:text-slate-900"
          >
            + New deal
          </Link>
        </div>
        {company.deals.length === 0 ? (
          <p className="text-sm text-slate-500">No deals for this company yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {company.deals.map((deal) => (
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
    </div>
  );
}
