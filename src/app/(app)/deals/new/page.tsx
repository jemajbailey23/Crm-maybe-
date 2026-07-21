import { prisma } from "@/lib/prisma";
import { DealForm } from "../deal-form";
import { createDeal } from "../actions";

export default async function NewDealPage({
  searchParams,
}: {
  searchParams: Promise<{ contactId?: string; companyId?: string }>;
}) {
  const { contactId, companyId } = await searchParams;

  const [contacts, companies] = await Promise.all([
    prisma.contact.findMany({
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.company.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">New deal</h1>
        <p className="text-sm text-slate-500">Add a deal to your pipeline.</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <DealForm
          action={createDeal}
          contacts={contacts}
          companies={companies}
          defaultValues={{ contactId, companyId }}
          submitLabel="Create deal"
        />
      </div>
    </div>
  );
}
