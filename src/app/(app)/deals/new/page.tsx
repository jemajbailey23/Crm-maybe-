import { prisma } from "@/lib/prisma";
import { DealForm } from "../deal-form";
import { createDeal } from "../actions";
import { getStageLabels, stageOptions } from "@/lib/pipeline-stages";

export default async function NewDealPage({
  searchParams,
}: {
  searchParams: Promise<{
    contactId?: string;
    companyId?: string;
    title?: string;
    stage?: string;
  }>;
}) {
  const { contactId, companyId, title, stage } = await searchParams;

  const [contacts, companies, stageLabels, users, serviceTypes] = await Promise.all([
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

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">New deal</h1>
        <p className="mt-1 text-sm text-zinc-500">Add a deal to your pipeline.</p>
      </div>
      <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <DealForm
          action={createDeal}
          contacts={contacts}
          companies={companies}
          users={users}
          serviceTypes={serviceTypes.map((s) => s.name)}
          stages={stageOptions(stageLabels)}
          defaultValues={{ contactId, companyId, title, stage }}
          submitLabel="Create deal"
        />
      </div>
    </div>
  );
}
