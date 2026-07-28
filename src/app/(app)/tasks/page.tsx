import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toggleTaskStatus, deleteTask } from "./actions";
import { TaskQuickForm } from "./task-quick-form";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default async function TasksPage() {
  const tasks = await prisma.task.findMany({
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    include: { contact: true, deal: true },
  });

  const openTasks = tasks.filter((task) => task.status === "OPEN");
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
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">
          Open ({openTasks.length})
        </h2>
        {openTasks.length === 0 ? (
          <p className="text-sm text-zinc-500">Nothing open. Nice.</p>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {openTasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between py-2.5 text-sm">
                <div className="flex items-center gap-2.5">
                  <form action={toggleTaskStatus.bind(null, task.id, task.status)}>
                    <button
                      type="submit"
                      className="h-4 w-4 rounded border border-zinc-700 bg-zinc-900 transition-colors hover:border-zinc-600"
                      aria-label="Toggle task status"
                    />
                  </form>
                  <div>
                    <p className="text-zinc-200">{task.title}</p>
                    <p className="text-xs text-zinc-500">
                      {task.dueDate ? formatDate(task.dueDate) : "No due date"}
                      {task.contact && (
                        <>
                          {" · "}
                          <Link href={`/contacts/${task.contact.id}`} className="hover:text-indigo-400">
                            {task.contact.firstName} {task.contact.lastName}
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
                    </p>
                  </div>
                </div>
                <form action={deleteTask.bind(null, task.id)}>
                  <button type="submit" className="text-xs text-zinc-600 transition-colors hover:text-red-400">
                    Remove
                  </button>
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
                  <p className="text-zinc-500 line-through">{task.title}</p>
                </div>
                <form action={deleteTask.bind(null, task.id)}>
                  <button type="submit" className="text-xs text-zinc-600 transition-colors hover:text-red-400">
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
