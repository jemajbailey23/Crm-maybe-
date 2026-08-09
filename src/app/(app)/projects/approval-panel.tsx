"use client";

import { useActionState, useRef, useTransition } from "react";
import { addApproval, setApprovalStatus, deleteApproval, type ApprovalFormState } from "./approval-actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";

const initialState: ApprovalFormState = {};

type Approval = { id: string; label: string; status: string; requestedAt: Date; respondedAt: Date | null };

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-400 ring-1 ring-inset ring-amber-500/20",
  APPROVED: "bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20",
  REJECTED: "bg-red-500/10 text-red-400 ring-1 ring-inset ring-red-500/20",
};

function ApprovalRow({ approval }: { approval: Approval }) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex flex-wrap items-center justify-between gap-2.5 py-2 text-sm">
      <span className="min-w-0 truncate text-zinc-200">{approval.label}</span>
      <div className="flex shrink-0 items-center gap-2">
        <select
          value={approval.status}
          disabled={isPending}
          onChange={(e) => startTransition(() => setApprovalStatus(approval.id, e.target.value))}
          className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium disabled:opacity-50 ${STATUS_STYLE[approval.status] ?? ""}`}
        >
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <form action={deleteApproval.bind(null, approval.id)}>
          <ConfirmSubmitButton
            confirmMessage="Remove this approval request?"
            className="text-xs text-zinc-600 transition-colors hover:text-red-400"
          >
            Remove
          </ConfirmSubmitButton>
        </form>
      </div>
    </li>
  );
}

export function ApprovalPanel({ projectId, approvals }: { projectId: string; approvals: Approval[] }) {
  const action = addApproval.bind(null, projectId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  const pendingCount = approvals.filter((a) => a.status === "PENDING").length;

  return (
    <div>
      <form
        ref={formRef}
        action={async (formData) => {
          await formAction(formData);
          formRef.current?.reset();
        }}
        className="mb-3 flex gap-2"
      >
        <input
          name="label"
          required
          placeholder="Add an approval request"
          className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
      {approvals.length === 0 ? (
        <p className="text-sm text-zinc-500">No approval requests yet.</p>
      ) : (
        <>
          {pendingCount > 0 && <p className="mb-1 text-xs text-amber-400">{pendingCount} pending</p>}
          <ul className="divide-y divide-zinc-800/60">
            {approvals.map((a) => (
              <ApprovalRow key={a.id} approval={a} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
