import { prisma } from "@/lib/prisma";
import { ProjectForm } from "../project-form";
import { createProject } from "../actions";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ contactId?: string; name?: string }>;
}) {
  const { contactId, name } = await searchParams;

  const contacts = await prisma.contact.findMany({
    orderBy: { firstName: "asc" },
    select: { id: true, firstName: true, lastName: true, businessName: true },
  });

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">New project</h1>
        <p className="mt-1 text-sm text-zinc-500">Start a new project for a client.</p>
      </div>
      <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <ProjectForm
          action={createProject}
          contacts={contacts}
          defaultValues={{ contactId, name }}
          submitLabel="Create project"
        />
      </div>
    </div>
  );
}
