import { prisma } from "@/lib/prisma";
import { findBookingByManageToken, getAvailableSlotsForType } from "@/lib/booking-engine";
import { ManagePanel } from "./manage-panel";

export const dynamic = "force-dynamic";

const STATUS_COPY: Record<string, string> = {
  CANCELLED: "This booking has been cancelled.",
  COMPLETED: "This meeting has already taken place.",
  NO_SHOW: "This meeting was marked as a no-show.",
  RESCHEDULED: "This booking was rescheduled to a new time.",
};

export default async function ManageBookingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const booking = await findBookingByManageToken(token);

  if (!booking) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16 text-center">
        <p className="text-sm text-zinc-500">
          We couldn&apos;t find a booking for this link. It may have already been used, or the link is incorrect.
        </p>
      </div>
    );
  }

  const owner = await prisma.user.findFirst();
  const when = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: booking.timezone,
  }).format(booking.startsAt);

  let rescheduleSlots: string[] = [];
  let newBookingManageUrl: string | null = null;

  if (booking.status === "CONFIRMED" && booking.meetingType?.allowRescheduling && owner) {
    const slots = await getAvailableSlotsForType(booking.meetingType, owner, new Date(), booking.id);
    rescheduleSlots = slots.map((s) => s.toISOString());
  }

  if (booking.status === "RESCHEDULED") {
    const next = await prisma.booking.findUnique({ where: { rescheduledFromId: booking.id } });
    if (next?.manageToken) newBookingManageUrl = `/book/manage/${next.manageToken}`;
  }

  return (
    <div className="flex flex-1 justify-center px-4 py-12">
      <div className="animate-slide-up w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/20">
            BV
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Manage your booking</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {booking.meetingType?.name ?? "Meeting"} — {when}
          </p>
        </div>

        {booking.status !== "CONFIRMED" ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
            <p className="text-sm text-zinc-300">{STATUS_COPY[booking.status] ?? "This booking is no longer active."}</p>
            {booking.cancelReason && <p className="mt-2 text-xs text-zinc-500">Reason: {booking.cancelReason}</p>}
            {newBookingManageUrl && (
              <a href={newBookingManageUrl} className="mt-3 inline-block text-sm text-indigo-400 hover:text-indigo-300">
                Manage your new time →
              </a>
            )}
          </div>
        ) : (
          <ManagePanel
            token={token}
            allowRescheduling={Boolean(booking.meetingType?.allowRescheduling)}
            rescheduleSlots={rescheduleSlots}
            slotMinutes={booking.meetingType?.durationMinutes ?? 30}
            cancellationPolicy={booking.meetingType?.cancellationPolicy ?? null}
          />
        )}
      </div>
    </div>
  );
}
