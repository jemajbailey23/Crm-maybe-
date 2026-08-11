import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAvailableSlotsForType } from "@/lib/booking-engine";
import { BookingPicker } from "./booking-picker";

// Availability depends on live data (current time, existing bookings) —
// never prerender this at build time.
export const dynamic = "force-dynamic";

export default async function BookMeetingTypePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [meetingType, owner] = await Promise.all([
    prisma.meetingType.findUnique({ where: { slug } }),
    prisma.user.findFirst(),
  ]);

  if (!meetingType || !meetingType.isActive) notFound();

  if (!owner) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16 text-center">
        <p className="text-sm text-zinc-500">Booking isn&apos;t set up yet.</p>
      </div>
    );
  }

  const slots = await getAvailableSlotsForType(meetingType, owner);
  const questions =
    (meetingType.intakeQuestions as unknown as { id: string; label: string; required: boolean }[] | null) ?? [];

  return (
    <div className="flex flex-1 justify-center px-4 py-12">
      <div className="animate-slide-up w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/20">
            BV
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">{meetingType.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {meetingType.description || "Bailey Ventures Digital"}
          </p>
        </div>
        <BookingPicker
          meetingTypeSlug={meetingType.slug}
          slots={slots.map((s) => s.toISOString())}
          slotMinutes={meetingType.durationMinutes}
          questions={questions}
          cancellationPolicy={meetingType.cancellationPolicy}
        />
      </div>
    </div>
  );
}
