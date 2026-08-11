"use client";

import { useActionState, useState } from "react";
import type { DealStage } from "@prisma/client";
import { STAGE_ORDER } from "@/lib/pipeline-stage-constants";
import type { AvailabilityRule } from "@/lib/availability";
import { WeeklyAvailabilityFields, useWeeklyAvailability } from "../weekly-availability-fields";
import type { MeetingTypeState } from "./actions";

type Question = { id: string; label: string; required: boolean };

function questionsToText(questions: Question[]): string {
  return questions.map((q) => (q.required ? `${q.label}|required` : q.label)).join("\n");
}

export type MeetingTypeInitial = {
  name: string;
  description: string | null;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
  intakeQuestions: unknown;
  confirmationSubject: string | null;
  confirmationBody: string | null;
  reminderHoursBefore: unknown;
  cancellationPolicy: string | null;
  minCancelNoticeHours: number | null;
  allowRescheduling: boolean;
  isActive: boolean;
  relatedDealStage: DealStage | null;
  sortOrder: number;
  weeklyAvailability: unknown;
};

export function MeetingTypeForm({
  action,
  initial,
  stageLabels,
  submitLabel,
}: {
  action: (state: MeetingTypeState, formData: FormData) => Promise<MeetingTypeState>;
  initial: MeetingTypeInitial;
  stageLabels: Record<string, string>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [useCustomAvailability, setUseCustomAvailability] = useState(
    Boolean(initial.weeklyAvailability && (initial.weeklyAvailability as AvailabilityRule[]).length > 0)
  );
  const [days, setDays] = useWeeklyAvailability((initial.weeklyAvailability as AvailabilityRule[] | null) ?? []);

  const questions = (initial.intakeQuestions as Question[] | null) ?? [];
  const reminderHours = (initial.reminderHoursBefore as number[] | null) ?? [];

  return (
    <form action={formAction} className="max-w-2xl space-y-8">
      <section className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300">Name</label>
          <input
            name="name"
            required
            defaultValue={initial.name}
            className="mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300">Description</label>
          <textarea
            name="description"
            rows={2}
            defaultValue={initial.description ?? ""}
            className="mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-zinc-300">Duration (min)</label>
            <input
              name="durationMinutes"
              type="number"
              min={5}
              max={480}
              required
              defaultValue={initial.durationMinutes}
              className="mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300">Sort order</label>
            <input
              name="sortOrder"
              type="number"
              defaultValue={initial.sortOrder}
              className="mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <label className="flex items-center gap-2 pt-6 text-sm text-zinc-300">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={initial.isActive}
              className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500"
            />
            Active (bookable)
          </label>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-100">Buffers &amp; booking window</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label className="block text-xs text-zinc-400">Buffer before (min)</label>
            <input
              name="bufferBeforeMinutes"
              type="number"
              min={0}
              defaultValue={initial.bufferBeforeMinutes}
              className="mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400">Buffer after (min)</label>
            <input
              name="bufferAfterMinutes"
              type="number"
              min={0}
              defaultValue={initial.bufferAfterMinutes}
              className="mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400">Min. notice (hrs)</label>
            <input
              name="minNoticeHours"
              type="number"
              min={0}
              defaultValue={initial.minNoticeHours}
              className="mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400">Max. advance (days)</label>
            <input
              name="maxAdvanceDays"
              type="number"
              min={1}
              defaultValue={initial.maxAdvanceDays}
              className="mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </section>

      <section>
        <label className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <input
            type="checkbox"
            name="useCustomAvailability"
            checked={useCustomAvailability}
            onChange={(e) => setUseCustomAvailability(e.target.checked)}
            className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500"
          />
          Use custom hours for this meeting type
        </label>
        <p className="mt-1 text-xs text-zinc-500">
          Off uses your default weekly availability from the Booking settings above.
        </p>
        {useCustomAvailability && (
          <div className="mt-3">
            <WeeklyAvailabilityFields namePrefix="avail-" days={days} onChange={setDays} />
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold text-zinc-100">Intake questions</h2>
        <p className="mb-2 text-xs text-zinc-500">
          One per line. Add <code className="text-zinc-400">|required</code> to require an answer, e.g.{" "}
          <code className="text-zinc-400">What&apos;s your budget?|required</code>
        </p>
        <textarea
          name="intakeQuestions"
          rows={3}
          defaultValue={questionsToText(questions)}
          className="block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-100">Confirmation email</h2>
        <p className="mb-2 text-xs text-zinc-500">
          Leave blank to use a generic default. Tokens: <code className="text-zinc-400">{"{{name}}"}</code>{" "}
          <code className="text-zinc-400">{"{{date}}"}</code> <code className="text-zinc-400">{"{{meetingType}}"}</code>
        </p>
        <div className="space-y-3">
          <input
            name="confirmationSubject"
            placeholder="Confirmed: {{meetingType}}"
            defaultValue={initial.confirmationSubject ?? ""}
            className="block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <textarea
            name="confirmationBody"
            rows={3}
            placeholder="Hi {{name}}, you're confirmed for {{date}}."
            defaultValue={initial.confirmationBody ?? ""}
            className="block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold text-zinc-100">Reminders</h2>
        <p className="mb-2 text-xs text-zinc-500">Hours before the meeting, comma-separated. E.g. 24, 1</p>
        <input
          name="reminderHoursBefore"
          defaultValue={reminderHours.join(", ")}
          placeholder="24, 1"
          className="block w-full max-w-xs rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-100">Cancellation &amp; rescheduling</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-400">Cancellation policy (shown to visitors)</label>
            <textarea
              name="cancellationPolicy"
              rows={2}
              defaultValue={initial.cancellationPolicy ?? ""}
              className="mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs text-zinc-400">Min. cancellation notice (hrs, optional)</label>
              <input
                name="minCancelNoticeHours"
                type="number"
                min={0}
                defaultValue={initial.minCancelNoticeHours ?? ""}
                className="mt-1 block w-32 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                name="allowRescheduling"
                defaultChecked={initial.allowRescheduling}
                className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500"
              />
              Allow visitors to self-reschedule
            </label>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold text-zinc-100">Related pipeline action</h2>
        <p className="mb-2 text-xs text-zinc-500">
          When someone books this meeting type, advance their deal to this stage (never moves a deal backward).
        </p>
        <select
          name="relatedDealStage"
          defaultValue={initial.relatedDealStage ?? ""}
          className="block w-full max-w-xs rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">Don&apos;t change the deal stage</option>
          {STAGE_ORDER.map((stage) => (
            <option key={stage} value={stage}>
              {stageLabels[stage] ?? stage}
            </option>
          ))}
        </select>
      </section>

      {state?.error && (
        <p className="text-sm text-red-400" aria-live="polite">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400 disabled:opacity-50"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
