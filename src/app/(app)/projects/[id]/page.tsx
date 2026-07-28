import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProjectForm } from "../project-form";
import { updateProject, deleteProject } from "../actions";
import { ProjectProgressControl } from "../project-progress-control";
import { ChecklistPanel } from "../checklist-panel";
import { TimeEntryForm } from "../time-entry-form";
import { deleteTimeEntry } from "../time-actions";
import { toggleTaskStatus, deleteTask } from "../../tasks/actions";
import { deleteActivity } from "../../activities/actions";
import { deleteAttachment } from "../../contacts/attachments-actions";
import { TaskQuickForm } from "../../tasks/task-quick-form";
import { ActivityQuickForm } from "../../activities/activity-quick-form";
import { AttachmentUploadForm } from "../../contacts/attachment-upload-form";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import {
  ProjectStatusBadge,
  PriorityBadge,
  ActivityTypeBadge,
} from "@/components/ui/badge";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatHours(minutes: number) {
  return (minutes / 60).toFixed(minutes % 60 === 0 ? 0 : 2);
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [project, contacts] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: {
        contact: true,
        tasks: { orderBy: [{ status: "asc" }, { dueDate: "asc" }] },
        checklist: { orderBy: { createdAt: "asc" } },
        attachments: { orderBy: { createdAt: "desc" } },
        activities: { orderBy: { occurredAt: "desc" } },
        timeEntries: { orderBy: { occurredAt: "desc" } },
      },
    }),
    prisma.contact.findMany({
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true, businessName: true },
    }),
  ]);

  if (!project) notFound();

  const updateProjectWithId = updateProject.bind(null, project.id);
  const deleteProjectWithId = deleteProject.bind(null, project.id);
  const totalMinutes = project.timeEntries.reduce((sum, e) => sum + e.minutes, 0);

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            {project.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            <Link
              href={`/contacts/${project.contact.id}`}
              className="hover:text-indigo-400"
            >
              {project.contact.businessName ||
                `${project.contact.firstName} ${project.contact.lastName}`}
            </Link>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ProjectStatusBadge status={project.status} />
            <PriorityBadge priority={project.priority} />
            {project.dueDate && (
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300">
                Due {formatDate(project.dueDate)}
              </span>
            )}
          </div>
        </div>
        <form action={deleteProjectWithId}>
          <ConfirmSubmitButton
            confirmMessage={`Delete ${project.name}? This can't be undone.`}
            className="rounded-lg border border-red-500/30 px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
          >
            Delete project
          </ConfirmSubmitButton>
        </form>
      </div>

      <section className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="mb-4">
          <ProjectProgressControl projectId={project.id} progress={project.progress} />
        </div>
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">Details</h2>
        <ProjectForm
          action={updateProjectWithId}
          contacts={contacts}
          defaultValues={project}
          submitLabel="Save changes"
        />
      </section>

      <section className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">Checklist</h2>
        <ChecklistPanel projectId={project.id} items={project.checklist} />
      </section>

      <section className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">Assigned tasks</h2>
        <div className="mb-4">
          <TaskQuickForm projectId={project.id} />
        </div>
        {project.tasks.length === 0 ? (
          <p className="text-sm text-zinc-500">No tasks yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {project.tasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between py-2.5 text-sm">
                <div className="flex items-center gap-2.5">
                  <form action={toggleTaskStatus.bind(null, task.id, task.status)}>
                    <button
                      type="submit"
                      className={`h-4 w-4 rounded border transition-colors ${
                        task.status === "DONE"
                          ? "border-indigo-500 bg-indigo-500"
                          : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"
                      }`}
                      aria-label="Toggle task status"
                    />
                  </form>
                  <span
                    className={
                      task.status === "DONE"
                        ? "text-zinc-500 line-through"
                        : "text-zinc-200"
                    }
                  >
                    {task.title}
                  </span>
                  {task.dueDate && (
                    <span className="text-xs text-zinc-500">
                      {formatDate(task.dueDate)}
                    </span>
                  )}
                </div>
                <form action={deleteTask.bind(null, task.id)}>
                  <button
                    type="submit"
                    className="text-xs text-zinc-600 transition-colors hover:text-red-400"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">Files</h2>
        <div className="mb-4">
          <AttachmentUploadForm owner={{ projectId: project.id }} />
        </div>
        {project.attachments.length === 0 ? (
          <p className="text-sm text-zinc-500">No files uploaded yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {project.attachments.map((file) => (
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
                  <span className="text-xs text-zinc-500">
                    {formatBytes(file.sizeBytes)}
                  </span>
                  <form action={deleteAttachment.bind(null, file.id)}>
                    <button
                      type="submit"
                      className="text-xs text-zinc-600 transition-colors hover:text-red-400"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">Comments</h2>
        <div className="mb-4">
          <ActivityQuickForm projectId={project.id} />
        </div>
        {project.activities.length === 0 ? (
          <p className="text-sm text-zinc-500">No comments yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {project.activities.map((activity) => (
              <li key={activity.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="text-zinc-200">{activity.summary}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {formatDateTime(activity.occurredAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <ActivityTypeBadge type={activity.type} />
                  <form action={deleteActivity.bind(null, activity.id)}>
                    <button
                      type="submit"
                      className="text-xs text-zinc-600 transition-colors hover:text-red-400"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-100">Time tracking</h2>
          <span className="text-xs font-medium text-zinc-400">
            {formatHours(totalMinutes)} hrs logged
          </span>
        </div>
        <div className="mb-4">
          <TimeEntryForm projectId={project.id} />
        </div>
        {project.timeEntries.length === 0 ? (
          <p className="text-sm text-zinc-500">No time logged yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {project.timeEntries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="text-zinc-200">
                    {formatHours(entry.minutes)} hrs
                    {entry.description ? ` · ${entry.description}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {formatDate(entry.occurredAt)}
                  </p>
                </div>
                <form action={deleteTimeEntry.bind(null, entry.id)}>
                  <button
                    type="submit"
                    className="text-xs text-zinc-600 transition-colors hover:text-red-400"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
