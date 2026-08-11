import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { AutomationForm } from "../automation-form";
import { updateAutomationRule, deleteAutomationRule, duplicateAutomationRule } from "../actions";
import { TestRunButton } from "../test-run-button";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Badge } from "@/components/ui/badge";
import { ACTION_LABEL } from "../meta";

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
    include: {
      actions: { orderBy: { order: "asc" } },
      runs: { orderBy: { createdAt: "desc" }, take: 30, include: { action: true } },
    },
  });

  if (!rule) notFound();

  const updateWithId = updateAutomationRule.bind(null, rule.id);
  const deleteWithId = deleteAutomationRule.bind(null, rule.id);
  const duplicateWithId = duplicateAutomationRule.bind(null, rule.id);

  // Actions can be deleted out from under a run by editing the rule
  // afterward (the FK cascades) — actionOrderById only covers the ones
  // that still exist, so a run from a since-removed step just falls back
  // to its own recorded action type below.
  const actionOrderById = new Map(rule.actions.map((a, i) => [a.id, i + 1]));

  return (
    <div className="max-w-lg space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            {rule.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">Edit this automation.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <form action={duplicateWithId}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
            >
              Duplicate
            </button>
          </form>
          <form action={deleteWithId}>
            <ConfirmSubmitButton
              confirmMessage={`Delete "${rule.name}"? This can't be undone.`}
              className="rounded-lg border border-red-500/30 px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
            >
              Delete
            </ConfirmSubmitButton>
          </form>
        </div>
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
          actions: rule.actions.map((a) => ({
            id: a.id,
            actionType: a.actionType,
            taskTitle: a.taskTitle,
            taskDueInDays: a.taskDueInDays,
            emailRecipient: a.emailRecipient,
            emailSubject: a.emailSubject,
            emailBody: a.emailBody,
            webhookUrl: a.webhookUrl,
          })),
        }}
      />

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="mb-1 text-sm font-semibold text-zinc-100">Test this automation</h2>
        <TestRunButton ruleId={rule.id} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-100">Recent runs</h2>
        {rule.runs.length === 0 ? (
          <p className="text-sm text-zinc-500">
            This automation hasn&apos;t fired yet.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-800/60 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4">
            {rule.runs.map((run) => {
              const step = actionOrderById.get(run.actionId);
              return (
                <li
                  key={run.id}
                  className="flex items-center justify-between gap-3 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate text-zinc-200">
                      {step ? `Step ${step}: ` : ""}
                      {ACTION_LABEL[run.action.actionType]} — {run.summary}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {formatDateTime(run.createdAt, user.bookingTimezone)}
                      {run.error && ` · ${run.error}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {run.isTest && <Badge variant="violet">Test</Badge>}
                    <Badge variant={run.status === "SUCCESS" ? "emerald" : "red"}>
                      {run.status === "SUCCESS" ? "Success" : "Failed"}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
