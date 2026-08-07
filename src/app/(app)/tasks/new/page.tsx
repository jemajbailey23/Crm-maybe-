import { prisma } from "@/lib/prisma";
import { TaskForm } from "../task-form";
import { createTaskDetailed } from "../actions";

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{
    contactId?: string;
    companyId?: string;
    dealId?: string;
    projectId?: string;
    invoiceId?: string;
    title?: string;
    dueDate?: string;
  }>;
}) {
  const { contactId, companyId, dealId, projectId, invoiceId, title, dueDate } = await searchParams;

  const [contacts, companies, deals, projects, invoices, users, taskLabelRows] = await Promise.all([
    prisma.contact.findMany({
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true, businessName: true },
    }),
    prisma.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.deal.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.project.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        description: true,
        contact: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.taskLabelPreset.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
  ]);
  const taskLabels = taskLabelRows.map((t) => t.name);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">New task</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Create a task with the full field set — relationships, scheduling, and more.
        </p>
      </div>
      <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <TaskForm
          action={createTaskDetailed}
          contacts={contacts}
          companies={companies}
          deals={deals}
          projects={projects}
          invoices={invoices}
          users={users}
          taskLabels={taskLabels}
          defaultValues={{ contactId, companyId, dealId, projectId, invoiceId, title, dueDate }}
          submitLabel="Create task"
        />
      </div>
    </div>
  );
}
