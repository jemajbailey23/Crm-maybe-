import { prisma } from "@/lib/prisma";
import { generateAvailableSlots, type AvailabilityRule } from "@/lib/availability";
import { BookingPicker } from "./booking-picker";

// Availability depends on live data (current time, existing bookings) —
// never prerender this at build time.
export const dynamic = "force-dynamic";

export default async function BookPage() {
  const owner = await prisma.user.findFirst();

  if (!owner) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16 text-center">
        <p className="text-sm text-zinc-500">Booking isn&apos;t set up yet.</p>
      </div>
    );
  }

  const rules = (owner.weeklyAvailability as unknown as AvailabilityRule[] | null) ?? [];
  const existingBookings = await prisma.booking.findMany({
    where: { startsAt: { gte: new Date() } },
    select: { startsAt: true, endsAt: true },
  });

  const slots = generateAvailableSlots({
    rules,
    slotMinutes: owner.bookingSlotMinutes,
    timezone: owner.bookingTimezone,
    existingBookings,
  });

  return (
    <div className="flex flex-1 justify-center px-4 py-12">
      <div className="animate-slide-up w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/20">
            BV
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            Book Your Free Growth Audit
          </h1>
          <p className="mt-1 text-sm text-zinc-500">Bailey Ventures Digital</p>
        </div>
        <BookingPicker
          slots={slots.map((s) => s.toISOString())}
          slotMinutes={owner.bookingSlotMinutes}
        />
      </div>
    </div>
  );
}
