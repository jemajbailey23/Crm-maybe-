"use client";

import { useActionState, useRef, useTransition } from "react";
import { addMilestone, toggleMilestone, deleteMilestone, type MilestoneFormState } from "./milestone-actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";

const initialState: MilestoneFormState = {};

type Milestone = { id: string; title: string; dueDate: Date | null; completedAt: Date | null };

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function MilestoneRow({ milestone, now }: { milestone: Milestone; now: Date }) {
  const [isPending, startTransition] = useTransition();
  const overdue = !milestone.completedAt && milestone.dueDate && milestone.dueDate < now;

  return (
    <li className="flex items-center justify-between gap-2.5 py-2 text-sm">
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => toggleMilestone(milestone.id, !!milestone.completedAt))}
          aria-label="Toggle milestone complete"
          className={`h-4 w-4 shrink-0 rounded border transition-colors ${
            milestone.completedAt
              ? "border-indigo-500 bg-indigo-500"
              : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"
          }`}
        />
        <span className={`truncate ${milestone.completedAt ? "text-zinc-500 line-through" : "text-zinc-200"}`}>
          {milestone.title}
        </span>
        {milestone.dueDate && (
          <span className={`shrink-0 text-xs ${overdue ? "text-red-400" : "text-zinc-500"}`}>
            {formatDate(milestone.dueDate)}
          </span>
        )}
      </div>
      <form action={deleteMilestone.bind(null, milestone.id)}>
        <ConfirmSubmitButton
          confirmMessage="Remove this milestone?"
          className="text-xs text-zinc-600 transition-colors hover:text-red-400"
        >
          Remove
        </ConfirmSubmitButton>
      </form>
    </li>
  );
}

export function MilestonePanel({ projectId, milestones, now }: { projectId: string; milestones: Milestone[]; now: Date }) {
  const action = addMilestone.bind(null, projectId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  const doneCount = milestones.filter((m) => m.completedAt).length;

  return (
    <div>
      <form
        ref={formRef}
        action={async (formData) => {
          await formAction(formData);
          formRef.current?.reset();
        }}
        className="mb-3 flex flex-wrap gap-2"
      >
        <input
          name="title"
          required
          placeholder="Add a milestone"
          className="min-w-[10rem] flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <input
          name="dueDate"
          type="date"
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400 disabled:opacity-50"
        >
          Add
        </button>
      </form>
      {state?.error && <p className="mb-2 text-sm text-red-400">{state.error}</p>}
      {milestones.length === 0 ? (
        <p className="text-sm text-zinc-500">No milestones yet.</p>
      ) : (
        <>
          <p className="mb-1 text-xs text-zinc-500">
            {doneCount} of {milestones.length} complete
          </p>
          <ul className="divide-y divide-zinc-800/60">
            {milestones.map((m) => (
              <MilestoneRow key={m.id} milestone={m} now={now} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
