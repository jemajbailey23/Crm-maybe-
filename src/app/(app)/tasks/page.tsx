import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toggleTaskStatus, deleteTask } from "./actions";
import { TaskQuickForm } from "./task-quick-form";
import { PriorityBadge, RecurrenceBadge, LabelChips } from "@/components/ui/badge";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const tasks = await prisma.task.findMany({
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    include: { contact: true, deal: true, project: true },
  });

  const now = new Date();
  const openTasksAll = tasks.filter((task) => task.status === "OPEN");
  const openTasks =
    filter === "overdue"
      ? openTasksAll.filter((task) => task.dueDate && task.dueDate < now)
      : openTasksAll;
  const doneTasks = tasks.filter((task) => task.status === "DONE");
  const progress = tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Tasks</h1>
        <p className="mt-1 text-sm text-zinc-500">Follow-ups across every contact and deal.</p>
      </div>

      {tasks.length > 0 && (
        <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-zinc-400">
              {doneTasks.length} of {tasks.length} complete
            </span>
            <span className="font-medium text-zinc-300">{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-linear-to-r from-indigo-500 to-violet-500 transition-[width] duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <TaskQuickForm />
      </div>

      <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-100">
            {filter === "overdue" ? "Overdue" : "Open"} ({openTasks.length})
          </h2>
          {filter === "overdue" && (
            <Link href="/tasks" className="text-xs font-medium text-zinc-500 hover:text-indigo-400">
              Clear filter
            </Link>
          )}
        </div>
        {openTasks.length === 0 ? (
          <p className="text-sm text-zinc-500">
            {filter === "overdue" ? "Nothing overdue. Nice." : "Nothing open. Nice."}
          </p>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {openTasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="flex min-w-0 items-center gap-2.5">
                  <form action={toggleTaskStatus.bind(null, task.id, task.status)}>
                    <button
                      type="submit"
                      className="h-4 w-4 shrink-0 rounded border border-zinc-700 bg-zinc-900 transition-colors hover:border-zinc-600"
                      aria-label="Toggle task status"
                    />
                  </form>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link
                        href={`/tasks/${task.id}`}
                        className="text-zinc-200 hover:text-indigo-400"
                      >
                        {task.title}
                      </Link>
                      <PriorityBadge priority={task.priority} />
                      <RecurrenceBadge recurrence={task.recurrence} />
                      <LabelChips labels={task.labels} />
                    </div>
                    <p className="text-xs text-zinc-500">
                      {task.dueDate ? formatDate(task.dueDate) : "No due date"}
                      {task.contact && (
                        <>
                          {" · "}
                          <Link href={`/contacts/${task.contact.id}`} className="hover:text-indigo-400">
                            {task.contact.businessName ||
                              `${task.contact.firstName} ${task.contact.lastName}`}
                          </Link>
                        </>
                      )}
                      {task.deal && (
                        <>
                          {" · "}
                          <Link href={`/deals/${task.deal.id}`} className="hover:text-indigo-400">
                            {task.deal.title}
                          </Link>
                        </>
                      )}
                      {task.project && (
                        <>
                          {" · "}
                          <Link href={`/projects/${task.project.id}`} className="hover:text-indigo-400">
                            {task.project.name}
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <form action={deleteTask.bind(null, task.id)}>
                  <ConfirmSubmitButton
                    confirmMessage="Delete this task?"
                    className="shrink-0 text-xs text-zinc-600 transition-colors hover:text-red-400"
                  >
                    Remove
                  </ConfirmSubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>

      {doneTasks.length > 0 && (
        <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-4 text-sm font-semibold text-zinc-100">
            Done ({doneTasks.length})
          </h2>
          <ul className="divide-y divide-zinc-800/60">
            {doneTasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between py-2.5 text-sm">
                <div className="flex items-center gap-2.5">
                  <form action={toggleTaskStatus.bind(null, task.id, task.status)}>
                    <button
                      type="submit"
                      className="h-4 w-4 rounded border border-indigo-500 bg-indigo-500 transition-colors"
                      aria-label="Toggle task status"
                    />
                  </form>
                  <Link
                    href={`/tasks/${task.id}`}
                    className="text-zinc-500 line-through hover:text-zinc-400"
                  >
                    {task.title}
                  </Link>
                </div>
                <form action={deleteTask.bind(null, task.id)}>
                  <ConfirmSubmitButton
                    confirmMessage="Delete this task?"
                    className="text-xs text-zinc-600 transition-colors hover:text-red-400"
                  >
                    Remove
                  </ConfirmSubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
