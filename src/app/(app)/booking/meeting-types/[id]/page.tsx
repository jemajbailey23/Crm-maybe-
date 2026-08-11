import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getStageLabels } from "@/lib/pipeline-stages";
import { MeetingTypeForm } from "../meeting-type-form";
import { updateMeetingType } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditMeetingTypePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const [meetingType, stageLabels] = await Promise.all([
    prisma.meetingType.findUnique({ where: { id } }),
    getStageLabels(),
  ]);

  if (!meetingType) notFound();

  const updateAction = updateMeetingType.bind(null, meetingType.id);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/booking" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← Booking
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50">Edit {meetingType.name}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Share link: /book/{meetingType.slug}
        </p>
      </div>
      <MeetingTypeForm action={updateAction} initial={meetingType} stageLabels={stageLabels} submitLabel="Save changes" />
    </div>
  );
}
