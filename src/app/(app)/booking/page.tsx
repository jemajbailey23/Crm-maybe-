import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { AvailabilityForm } from "./availability-form";
import { CopyLinkButton } from "@/components/copy-link-button";
import type { AvailabilityRule } from "@/lib/availability";

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
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
        <h1 className="text-xl font-semibold text-slate-900">Booking</h1>
        <p className="text-sm text-slate-500">
          Set your availability, and share your booking link so people can
          schedule a call directly into your CRM.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase text-slate-500">
            Your booking link
          </p>
          <p className="truncate text-sm text-slate-900">{bookingLink}</p>
        </div>
        <CopyLinkButton text={bookingLink} />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">
          Weekly availability
        </h2>
        <AvailabilityForm
          rules={(user.weeklyAvailability as unknown as AvailabilityRule[]) ?? []}
          slotMinutes={user.bookingSlotMinutes}
          timezone={user.bookingTimezone}
        />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">
          Upcoming calls
        </h2>
        {upcomingBookings.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing booked yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {upcomingBookings.map((booking) => (
              <li key={booking.id} className="py-2 text-sm">
                <p className="font-medium text-slate-900">
                  {formatDateTime(booking.startsAt)}
                </p>
                <p className="text-slate-500">
                  {booking.contact ? (
                    <Link
                      href={`/contacts/${booking.contact.id}`}
                      className="hover:underline"
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
