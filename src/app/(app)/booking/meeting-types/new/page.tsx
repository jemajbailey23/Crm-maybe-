import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getStageLabels } from "@/lib/pipeline-stages";
import { MeetingTypeForm, type MeetingTypeInitial } from "../meeting-type-form";
import { createMeetingType } from "../actions";

export const dynamic = "force-dynamic";

const BLANK: MeetingTypeInitial = {
  name: "",
  description: null,
  durationMinutes: 30,
  bufferBeforeMinutes: 0,
  bufferAfterMinutes: 0,
  minNoticeHours: 12,
  maxAdvanceDays: 30,
  intakeQuestions: [],
  confirmationSubject: null,
  confirmationBody: null,
  reminderHoursBefore: [24],
  cancellationPolicy: null,
  minCancelNoticeHours: 24,
  allowRescheduling: true,
  isActive: true,
  relatedDealStage: null,
  sortOrder: 0,
  weeklyAvailability: null,
};

export default async function NewMeetingTypePage() {
  await requireUser();
  const stageLabels = await getStageLabels();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/booking" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← Booking
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50">New meeting type</h1>
      </div>
      <MeetingTypeForm action={createMeetingType} initial={BLANK} stageLabels={stageLabels} submitLabel="Create meeting type" />
    </div>
  );
}
