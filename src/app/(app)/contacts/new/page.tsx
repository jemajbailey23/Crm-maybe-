import { prisma } from "@/lib/prisma";
import { ContactForm } from "../contact-form";
import { createContact } from "../actions";

export default async function NewContactPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  const { companyId } = await searchParams;
  const companies = await prisma.company.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">New contact</h1>
        <p className="text-sm text-slate-500">Add a person to your CRM.</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <ContactForm
          action={createContact}
          companies={companies}
          defaultValues={companyId ? { companyId } : undefined}
          submitLabel="Create contact"
        />
      </div>
    </div>
  );
}
