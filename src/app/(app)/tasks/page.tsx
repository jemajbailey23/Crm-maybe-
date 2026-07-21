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

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Tasks</h1>
        <p className="text-sm text-slate-500">Follow-ups across every contact and deal.</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <TaskQuickForm />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">
          Open ({openTasks.length})
        </h2>
        {openTasks.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing open. Nice.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {openTasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between py-2 text-sm">
                <div className="flex items-center gap-2">
                  <form action={toggleTaskStatus.bind(null, task.id, task.status)}>
                    <button
                      type="submit"
                      className="h-4 w-4 rounded border border-slate-300 bg-white"
                      aria-label="Toggle task status"
                    />
                  </form>
                  <div>
                    <p className="text-slate-900">{task.title}</p>
                    <p className="text-xs text-slate-500">
                      {task.dueDate ? formatDate(task.dueDate) : "No due date"}
                      {task.contact && (
                        <>
                          {" · "}
                          <Link href={`/contacts/${task.contact.id}`} className="hover:underline">
                            {task.contact.firstName} {task.contact.lastName}
                          </Link>
                        </>
                      )}
                      {task.deal && (
                        <>
                          {" · "}
                          <Link href={`/deals/${task.deal.id}`} className="hover:underline">
                            {task.deal.title}
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <form action={deleteTask.bind(null, task.id)}>
                  <button type="submit" className="text-xs text-slate-400 hover:text-red-600">
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>

      {doneTasks.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">
            Done ({doneTasks.length})
          </h2>
          <ul className="divide-y divide-slate-100">
            {doneTasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between py-2 text-sm">
                <div className="flex items-center gap-2">
                  <form action={toggleTaskStatus.bind(null, task.id, task.status)}>
                    <button
                      type="submit"
                      className="h-4 w-4 rounded border border-slate-900 bg-slate-900"
                      aria-label="Toggle task status"
                    />
                  </form>
                  <p className="text-slate-400 line-through">{task.title}</p>
                </div>
                <form action={deleteTask.bind(null, task.id)}>
                  <button type="submit" className="text-xs text-slate-400 hover:text-red-600">
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
