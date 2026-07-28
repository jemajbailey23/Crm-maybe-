import { prisma } from "@/lib/prisma";
import { ContactForm } from "../contact-form";
import { createContact } from "../actions";
import { getStageLabels, stageOptions } from "@/lib/pipeline-stages";

export default async function NewContactPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string; status?: string }>;
}) {
  const { companyId, status } = await searchParams;
  const [companies, stageLabels] = await Promise.all([
    prisma.company.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    getStageLabels(),
  ]);

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
          stages={stageOptions(stageLabels)}
          defaultValues={{ companyId, status }}
          submitLabel="Create contact"
        />
      </div>
    </div>
  );
}
