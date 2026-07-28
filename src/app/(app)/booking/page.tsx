import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { AvailabilityForm } from "./availability-form";
import { CopyLinkButton } from "@/components/copy-link-button";
import type { AvailabilityRule } from "@/lib/availability";

function formatDateTime(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
    timeZoneName: "short",
  }).format(date);
}

export default async function BookingSettingsPage() {
  const user = await requireUser();

  const upcomingBookings = await prisma.booking.findMany({
    where: { startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    include: { contact: true },
    take: 20,
  });

  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
  const bookingLink = `${baseUrl}/book`;

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Booking</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Set your availability, and share your booking link so people can
          schedule a call directly into your CRM.
        </p>
      </div>

      <div className="animate-slide-up flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Your booking link
          </p>
          <p className="truncate text-sm text-zinc-100">{bookingLink}</p>
        </div>
        <CopyLinkButton text={bookingLink} />
      </div>

      <section className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">
          Weekly availability
        </h2>
        <AvailabilityForm
          rules={(user.weeklyAvailability as unknown as AvailabilityRule[]) ?? []}
          slotMinutes={user.bookingSlotMinutes}
          timezone={user.bookingTimezone}
        />
      </section>

      <section className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">
          Upcoming calls
        </h2>
        {upcomingBookings.length === 0 ? (
          <p className="text-sm text-zinc-500">Nothing booked yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {upcomingBookings.map((booking) => (
              <li key={booking.id} className="py-2.5 text-sm">
                <p className="font-medium text-zinc-100">
                  {formatDateTime(booking.startsAt, user.bookingTimezone)}
                </p>
                <p className="text-zinc-500">
                  {booking.contact ? (
                    <Link
                      href={`/contacts/${booking.contact.id}`}
                      className="hover:text-indigo-400"
                    >
                      {booking.name}
                    </Link>
                  ) : (
                    booking.name
                  )}{" "}
                  · {booking.email}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
