import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { AutomationForm } from "../automation-form";
import { updateAutomationRule, deleteAutomationRule } from "../actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Badge } from "@/components/ui/badge";

function formatDateTime(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
    timeZoneName: "short",
  }).format(date);
}

export default async function AutomationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const rule = await prisma.automationRule.findUnique({
    where: { id },
    include: { runs: { orderBy: { createdAt: "desc" }, take: 20 } },
  });

  if (!rule) notFound();

  const updateWithId = updateAutomationRule.bind(null, rule.id);
  const deleteWithId = deleteAutomationRule.bind(null, rule.id);

  return (
    <div className="max-w-lg space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            {rule.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">Edit this automation.</p>
        </div>
        <form action={deleteWithId}>
          <ConfirmSubmitButton
            confirmMessage={`Delete "${rule.name}"? This can't be undone.`}
            className="rounded-lg border border-red-500/30 px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
          >
            Delete
          </ConfirmSubmitButton>
        </form>
      </div>

      <AutomationForm
        // Force a fresh mount every time the rule actually changes (including
        // right after a save) instead of reusing the previous form instance.
        // React 19 resets a <form>'s fields back to their very first render
        // once its action completes — for a plain re-render that's harmless
        // on uncontrolled inputs (they revert to what's already saved), but
        // it snaps controlled selects like "Do this…" back to the first
        // <option> in the list, visually corrupting the field until the next
        // real edit. Remounting via `key` sidesteps all of that by always
        // starting the form fresh from the current database values.
        key={rule.updatedAt.toISOString()}
        action={updateWithId}
        submitLabel="Save changes"
        defaultValues={{
          name: rule.name,
          trigger: rule.trigger,
          actionType: rule.actionType,
          taskTitle: rule.taskTitle,
          taskDueInDays: rule.taskDueInDays,
          emailRecipient: rule.emailRecipient,
          emailSubject: rule.emailSubject,
          emailBody: rule.emailBody,
          webhookUrl: rule.webhookUrl,
        }}
      />

      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-100">Recent runs</h2>
        {rule.runs.length === 0 ? (
          <p className="text-sm text-zinc-500">
            This automation hasn&apos;t fired yet.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-800/60 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4">
            {rule.runs.map((run) => (
              <li
                key={run.id}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate text-zinc-200">{run.summary}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {formatDateTime(run.createdAt, user.bookingTimezone)}
                    {run.error && ` · ${run.error}`}
                  </p>
                </div>
                <Badge variant={run.status === "SUCCESS" ? "emerald" : "red"}>
                  {run.status === "SUCCESS" ? "Success" : "Failed"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
