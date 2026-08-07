import Link from "next/link";
import { TaskStatusSelect } from "./task-status-select";
import { deleteTask } from "./actions";
import { PriorityBadge, RecurrenceBadge, LabelChips } from "@/components/ui/badge";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export type TaskRowData = {
  id: string;
  title: string;
  status: string;
  priority: string;
  recurrence: string;
  labels: string | null;
  dueDate: Date | null;
  waitingReason?: string | null;
  blockedReason?: string | null;
  contact: { id: string; firstName: string; lastName: string; businessName: string | null } | null;
  company: { id: string; name: string } | null;
  deal: { id: string; title: string } | null;
  project: { id: string; name: string } | null;
  invoice: { id: string; description: string } | null;
};

export function TaskRow({
  task,
  hideRelation,
  now,
}: {
  task: TaskRowData;
  hideRelation?: "contact" | "company" | "deal" | "project" | "invoice";
  now?: Date;
}) {
  const overdue = !!task.dueDate && now && task.dueDate < now && task.status !== "COMPLETED" && task.status !== "CANCELLED";

  return (
    <li className="flex flex-col gap-2 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link href={`/tasks/${task.id}`} className="font-medium text-zinc-200 hover:text-indigo-400">
            {task.title}
          </Link>
          <PriorityBadge priority={task.priority} />
          <RecurrenceBadge recurrence={task.recurrence} />
          <LabelChips labels={task.labels} />
        </div>
        <p className="mt-0.5 truncate text-xs text-zinc-500">
          {task.dueDate ? (
            <span className={overdue ? "font-medium text-red-400" : ""}>
              {overdue ? "Overdue since " : "Due "}
              {formatDate(task.dueDate)}
            </span>
          ) : (
            "No due date"
          )}
          {task.status === "WAITING" && task.waitingReason && ` · Waiting: ${task.waitingReason}`}
          {task.status === "BLOCKED" && task.blockedReason && ` · Blocked: ${task.blockedReason}`}
          {task.contact && hideRelation !== "contact" && (
            <>
              {" · "}
              <Link href={`/contacts/${task.contact.id}`} className="hover:text-indigo-400">
                {task.contact.businessName || `${task.contact.firstName} ${task.contact.lastName}`}
              </Link>
            </>
          )}
          {task.company && hideRelation !== "company" && (
            <>
              {" · "}
              <Link href={`/companies/${task.company.id}`} className="hover:text-indigo-400">
                {task.company.name}
              </Link>
            </>
          )}
          {task.deal && hideRelation !== "deal" && (
            <>
              {" · "}
              <Link href={`/deals/${task.deal.id}`} className="hover:text-indigo-400">
                {task.deal.title}
              </Link>
            </>
          )}
          {task.project && hideRelation !== "project" && (
            <>
              {" · "}
              <Link href={`/projects/${task.project.id}`} className="hover:text-indigo-400">
                {task.project.name}
              </Link>
            </>
          )}
          {task.invoice && hideRelation !== "invoice" && (
            <>
              {" · "}
              <span>{task.invoice.description}</span>
            </>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <TaskStatusSelect taskId={task.id} status={task.status} />
        <form action={deleteTask.bind(null, task.id)}>
          <ConfirmSubmitButton
            confirmMessage="Delete this task?"
            className="text-xs text-zinc-600 transition-colors hover:text-red-400"
          >
            Remove
          </ConfirmSubmitButton>
        </form>
      </div>
    </li>
  );
}
