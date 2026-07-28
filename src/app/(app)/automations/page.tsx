import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TRIGGER_LABEL, actionSummary } from "./meta";
import { RuleToggle } from "./rule-toggle";

export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  const rules = await prisma.automationRule.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            Automations
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Automatically create tasks, send yourself emails, or call a webhook
            when something happens in the CRM.
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
          {rules.map((rule) => (
            <li
              key={rule.id}
              className="animate-slide-up flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-700"
            >
              <div className="min-w-0">
                <Link
                  href={`/automations/${rule.id}`}
                  className="font-medium text-zinc-100 hover:text-indigo-400"
                >
                  {rule.name}
                </Link>
                <p className="mt-0.5 text-xs text-zinc-500">
                  <span className="text-zinc-400">{TRIGGER_LABEL[rule.trigger]}</span>
                  {" → "}
                  {actionSummary(rule)}
                </p>
              </div>
              <RuleToggle ruleId={rule.id} enabled={rule.enabled} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
