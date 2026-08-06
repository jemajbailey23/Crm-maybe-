import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TaskForm } from "../task-form";
import { TaskProgressControl } from "../task-progress-control";
import { updateTask, toggleTaskStatus, deleteTaskFromDetail } from "../actions";
import { AttachmentUploadForm } from "../../contacts/attachment-upload-form";
import { deleteAttachment } from "../../contacts/attachments-actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import {
  TaskStatusBadge,
  PriorityBadge,
  RecurrenceBadge,
  LabelChips,
} from "@/components/ui/badge";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [task, contacts, projects, taskLabelRows] = await Promise.all([
    prisma.task.findUnique({
      where: { id },
      include: {
        contact: true,
        project: true,
        attachments: { orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.contact.findMany({
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true, businessName: true },
    }),
    prisma.project.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.taskLabelPreset.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
  ]);
  const taskLabels = taskLabelRows.map((t) => t.name);

  if (!task) notFound();

  const updateTaskWithId = updateTask.bind(null, task.id);
  const toggleWithId = toggleTaskStatus.bind(null, task.id, task.status);
  const deleteWithId = deleteTaskFromDetail.bind(null, task.id);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <form action={toggleWithId}>
              <button
                type="submit"
                className={`h-5 w-5 rounded border transition-colors ${
                  task.status === "DONE"
                    ? "border-indigo-500 bg-indigo-500"
                    : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"
                }`}
                aria-label="Toggle task status"
              />
            </form>
            <h1
              className={`text-2xl font-semibold tracking-tight ${
                task.status === "DONE" ? "text-zinc-500 line-through" : "text-zinc-50"
              }`}
            >
              {task.title}
            </h1>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            {task.contact && (
              <Link href={`/contacts/${task.contact.id}`} className="hover:text-indigo-400">
                {task.contact.businessName ||
                  `${task.contact.firstName} ${task.contact.lastName}`}
              </Link>
            )}
            {task.contact && task.project && " · "}
            {task.project && (
              <Link href={`/projects/${task.project.id}`} className="hover:text-indigo-400">
                {task.project.name}
              </Link>
            )}
            {!task.contact && !task.project && "Not linked to a client or project"}
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

      <section className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="mb-4">
          <TaskProgressControl taskId={task.id} progress={task.progress} />
        </div>
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">Details</h2>
        <TaskForm
          action={updateTaskWithId}
          contacts={contacts}
          projects={projects}
          taskLabels={taskLabels}
          defaultValues={task}
        />
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
