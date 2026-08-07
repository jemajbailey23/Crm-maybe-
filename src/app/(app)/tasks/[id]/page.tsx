import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TaskForm } from "../task-form";
import { TaskProgressControl } from "../task-progress-control";
import {
  updateTask,
  deleteTaskFromDetail,
  addChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
  addDependency,
  removeDependency,
  logTrackedTime,
} from "../actions";
import { AttachmentUploadForm } from "../../contacts/attachment-upload-form";
import { deleteAttachment } from "../../contacts/attachments-actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { ChecklistQuickForm } from "../checklist-quick-form";
import { DependencyPicker } from "../dependency-picker";
import { TimeLogForm } from "../time-log-form";
import {
  TaskStatusBadge,
  PriorityBadge,
  RecurrenceBadge,
  LabelChips,
} from "@/components/ui/badge";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [task, contacts, companies, deals, projects, invoices, users, taskLabelRows, otherTasks] =
    await Promise.all([
      prisma.task.findUnique({
        where: { id },
        include: {
          contact: true,
          company: true,
          deal: true,
          project: true,
          invoice: { include: { contact: true } },
          attachments: { orderBy: { createdAt: "desc" } },
          checklist: { orderBy: { createdAt: "asc" } },
          dependsOn: { include: { dependsOnTask: { select: { id: true, title: true, status: true } } } },
          dependedOnBy: { include: { task: { select: { id: true, title: true, status: true } } } },
        },
      }),
      prisma.contact.findMany({
        orderBy: { firstName: "asc" },
        select: { id: true, firstName: true, lastName: true, businessName: true },
      }),
      prisma.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.deal.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
      prisma.project.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.invoice.findMany({
        orderBy: { createdAt: "desc" },
        select: { id: true, description: true, contact: { select: { firstName: true, lastName: true } } },
      }),
      prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.taskLabelPreset.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
      prisma.task.findMany({
        where: { id: { not: id } },
        orderBy: { title: "asc" },
        select: { id: true, title: true, status: true },
      }),
    ]);
  const taskLabels = taskLabelRows.map((t) => t.name);

  if (!task) notFound();

  const updateTaskWithId = updateTask.bind(null, task.id);
  const deleteWithId = deleteTaskFromDetail.bind(null, task.id);
  const addChecklistItemWithId = addChecklistItem.bind(null, task.id);
  const addDependencyWithId = addDependency.bind(null, task.id);
  const logTimeWithId = logTrackedTime.bind(null, task.id);

  const incompleteDependencies = task.dependsOn.filter(
    (d) => d.dependsOnTask.status !== "COMPLETED" && d.dependsOnTask.status !== "CANCELLED"
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 break-words">{task.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {task.contact && (
              <Link href={`/contacts/${task.contact.id}`} className="hover:text-indigo-400">
                {task.contact.businessName || `${task.contact.firstName} ${task.contact.lastName}`}
              </Link>
            )}
            {task.contact && task.company && " · "}
            {task.company && (
              <Link href={`/companies/${task.company.id}`} className="hover:text-indigo-400">
                {task.company.name}
              </Link>
            )}
            {task.deal && (
              <>
                {(task.contact || task.company) && " · "}
                <Link href={`/deals/${task.deal.id}`} className="hover:text-indigo-400">
                  {task.deal.title}
                </Link>
              </>
            )}
            {task.project && (
              <>
                {(task.contact || task.company || task.deal) && " · "}
                <Link href={`/projects/${task.project.id}`} className="hover:text-indigo-400">
                  {task.project.name}
                </Link>
              </>
            )}
            {!task.contact && !task.company && !task.deal && !task.project && "Not linked to a record"}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <TaskStatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            <RecurrenceBadge recurrence={task.recurrence} />
            <LabelChips labels={task.labels} />
          </div>
        </div>
        <form action={deleteWithId}>
          <ConfirmSubmitButton
            confirmMessage={`Delete "${task.title}"? This can't be undone.`}
            className="rounded-lg border border-red-500/30 px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
          >
            Delete task
          </ConfirmSubmitButton>
        </form>
      </div>

      <section className="animate-slide-up flex flex-wrap gap-x-6 gap-y-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm">
        <div>
          <span className="text-zinc-500">Created: </span>
          <span className="font-medium text-zinc-200">{formatDate(task.createdAt)}</span>
        </div>
        <div>
          <span className="text-zinc-500">Completed: </span>
          <span className="font-medium text-zinc-200">
            {task.completedAt ? formatDate(task.completedAt) : "Not yet"}
          </span>
        </div>
        <div>
          <span className="text-zinc-500">Time tracked: </span>
          <span className="font-medium text-zinc-200">
            {formatMinutes(task.trackedMinutes)}
            {task.estimatedMinutes ? ` / ${formatMinutes(task.estimatedMinutes)} est.` : ""}
          </span>
        </div>
        {incompleteDependencies.length > 0 && (
          <div className="flex w-full flex-wrap items-center gap-1.5 pt-1">
            <span className="text-zinc-500">Waiting on: </span>
            {incompleteDependencies.map((d) => (
              <Link
                key={d.id}
                href={`/tasks/${d.dependsOnTask.id}`}
                className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400 ring-1 ring-inset ring-amber-500/20 hover:bg-amber-500/20"
              >
                {d.dependsOnTask.title}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TaskProgressControl taskId={task.id} progress={task.progress} />
          <TimeLogForm action={logTimeWithId} />
        </div>
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">Details</h2>
        <TaskForm
          action={updateTaskWithId}
          contacts={contacts}
          companies={companies}
          deals={deals}
          projects={projects}
          invoices={invoices}
          users={users}
          taskLabels={taskLabels}
          defaultValues={task}
        />
      </section>

      <section className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">Checklist</h2>
        <div className="mb-4">
          <ChecklistQuickForm action={addChecklistItemWithId} />
        </div>
        {task.checklist.length === 0 ? (
          <p className="text-sm text-zinc-500">No checklist items yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {task.checklist.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="flex min-w-0 items-center gap-2.5">
                  <form action={toggleChecklistItem.bind(null, item.id, item.done)}>
                    <button
                      type="submit"
                      className={`h-4 w-4 shrink-0 rounded border transition-colors ${
                        item.done ? "border-indigo-500 bg-indigo-500" : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"
                      }`}
                      aria-label="Toggle checklist item"
                    />
                  </form>
                  <span className={item.done ? "truncate text-zinc-500 line-through" : "truncate text-zinc-200"}>
                    {item.label}
                  </span>
                </div>
                <form action={deleteChecklistItem.bind(null, item.id)}>
                  <ConfirmSubmitButton
                    confirmMessage="Remove this checklist item?"
                    className="shrink-0 text-xs text-zinc-600 transition-colors hover:text-red-400"
                  >
                    Remove
                  </ConfirmSubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">Dependencies</h2>
        <p className="mb-4 text-xs text-zinc-500">
          Tasks this one depends on — informational, shown as &quot;Waiting on&quot; above until they&apos;re done.
        </p>
        <div className="mb-4">
          <DependencyPicker
            action={addDependencyWithId}
            tasks={otherTasks.filter((t) => !task.dependsOn.some((d) => d.dependsOnTaskId === t.id))}
          />
        </div>
        {task.dependsOn.length === 0 ? (
          <p className="text-sm text-zinc-500">No dependencies set.</p>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {task.dependsOn.map((dep) => (
              <li key={dep.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <Link href={`/tasks/${dep.dependsOnTask.id}`} className="min-w-0 truncate text-zinc-200 hover:text-indigo-400">
                  {dep.dependsOnTask.title}
                </Link>
                <div className="flex shrink-0 items-center gap-3">
                  <TaskStatusBadge status={dep.dependsOnTask.status} />
                  <form action={removeDependency.bind(null, dep.id)}>
                    <ConfirmSubmitButton
                      confirmMessage="Remove this dependency?"
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
        {task.dependedOnBy.length > 0 && (
          <div className="mt-4 border-t border-zinc-800 pt-4">
            <p className="mb-2 text-xs font-medium text-zinc-500">Blocking these tasks:</p>
            <ul className="space-y-1">
              {task.dependedOnBy.map((dep) => (
                <li key={dep.id}>
                  <Link href={`/tasks/${dep.task.id}`} className="text-sm text-zinc-300 hover:text-indigo-400">
                    {dep.task.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">Attachments</h2>
        <div className="mb-4">
          <AttachmentUploadForm owner={{ taskId: task.id }} />
        </div>
        {task.attachments.length === 0 ? (
          <p className="text-sm text-zinc-500">No files attached yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {task.attachments.map((file) => (
              <li key={file.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 truncate font-medium text-zinc-200 hover:text-indigo-400"
                >
                  {file.filename}
                </a>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-zinc-500">{formatBytes(file.sizeBytes)}</span>
                  <form action={deleteAttachment.bind(null, file.id)}>
                    <ConfirmSubmitButton
                      confirmMessage="Delete this file? This can't be undone."
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
