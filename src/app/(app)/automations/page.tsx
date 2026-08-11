import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TRIGGER_LABEL, actionsSummary } from "./meta";
import { RuleToggle } from "./rule-toggle";
import { duplicateAutomationRule } from "./actions";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

function formatRelative(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

export default async function AutomationsPage() {
  const rules = await prisma.automationRule.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      actions: { orderBy: { order: "asc" } },
      // Test runs shouldn't affect whether a rule reads as "failing" on the
      // list — only real trigger firings count here.
      runs: { where: { isTest: false }, orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            Automations
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Automatically create tasks, send an email to yourself or the
            contact involved, or call a webhook when something happens in
            the CRM.
          </p>
        </div>
        <Link
          href="/automations/new"
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400"
        >
          New automation
        </Link>
      </div>

      {rules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">
          No automations yet. Create one to react automatically to things like a
          new lead, a paid invoice, or a signed contract.
        </div>
      ) : (
        <ul className="space-y-3">
          {rules.map((rule) => {
            const lastRun = rule.runs[0];
            const recentFailures = rule.runs.filter((r) => r.status === "FAILED").length;
            return (
              <li
                key={rule.id}
                className="animate-slide-up flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-700"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/automations/${rule.id}`}
                      className="font-medium text-zinc-100 hover:text-indigo-400"
                    >
                      {rule.name}
                    </Link>
                    {recentFailures > 0 && (
                      <Badge variant="red">
                        {recentFailures} recent failure{recentFailures > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">
                    <span className="text-zinc-400">{TRIGGER_LABEL[rule.trigger]}</span>
                    {" → "}
                    {actionsSummary(rule.actions)}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-600">
                    {lastRun ? `Last fired ${formatRelative(lastRun.createdAt)}` : "Hasn't fired yet"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <form action={duplicateAutomationRule.bind(null, rule.id)}>
                    <button
                      type="submit"
                      className="rounded-lg border border-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
                    >
                      Duplicate
                    </button>
                  </form>
                  <RuleToggle ruleId={rule.id} enabled={rule.enabled} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
