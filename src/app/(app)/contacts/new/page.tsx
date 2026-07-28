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
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">New contact</h1>
        <p className="mt-1 text-sm text-zinc-500">Add a person to your CRM.</p>
      </div>
      <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
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
