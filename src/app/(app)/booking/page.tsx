import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { AvailabilityForm } from "./availability-form";
import { BrandedUrlForm } from "./branded-url-form";
import { BookingsList } from "./bookings-list";
import { LogsPanel } from "./logs-panel";
import { CopyLinkButton } from "@/components/copy-link-button";
import { toggleMeetingTypeActive } from "./meeting-types/actions";
import { ImportDefaultsButton } from "./meeting-types/import-defaults-button";
import { getPublicBookingBaseUrl, bookingTypeUrl } from "@/lib/booking-links";
import type { AvailabilityRule } from "@/lib/availability";

export const dynamic = "force-dynamic";

export default async function BookingSettingsPage() {
  const user = await requireUser();

  const [meetingTypes, upcomingBookings, recentLogs] = await Promise.all([
    prisma.meetingType.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.booking.findMany({
      where: { startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      include: { contact: true, meetingType: true },
      take: 30,
    }),
    prisma.bookingLog.findMany({ orderBy: { createdAt: "desc" }, take: 15 }),
  ]);

  const bookingLink = getPublicBookingBaseUrl(user) + "/book";
  const usingBrandedUrl = Boolean(user.bookingBrandedUrl?.trim());

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Booking</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Set your availability, configure meeting types, and share your booking link so people can
          schedule time directly into your CRM.
        </p>
      </div>

      <div className="animate-slide-up flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Your booking link {usingBrandedUrl && <span className="text-emerald-400">(branded)</span>}
          </p>
          <p className="truncate text-sm text-zinc-100">{bookingLink}</p>
        </div>
        <CopyLinkButton text={bookingLink} />
      </div>

      <section className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-1 text-sm font-semibold text-zinc-100">Branded booking URL</h2>
        <p className="mb-4 text-sm text-zinc-500">
          Point a custom domain at this deployment in Vercel first, then enter it here — every link shown
          or emailed to prospects (this share link, confirmation and reminder emails) will use it instead
          of the raw deployment URL.
        </p>
        <BrandedUrlForm current={user.bookingBrandedUrl} />
      </section>

      <section className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">
          Default weekly availability
        </h2>
        <AvailabilityForm
          rules={(user.weeklyAvailability as unknown as AvailabilityRule[]) ?? []}
          timezone={user.bookingTimezone}
        />
      </section>

      <section className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-100">Meeting types</h2>
          <div className="flex items-center gap-2">
            <ImportDefaultsButton />
            <Link
              href="/booking/meeting-types/new"
              className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400"
            >
              New meeting type
            </Link>
          </div>
        </div>
        {meetingTypes.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No meeting types yet — add the 5 standard ones above, or create your own, so people can actually
            book time with you.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {meetingTypes.map((type) => (
              <li key={type.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium text-zinc-100">
                    {type.name}
                    {!type.isActive && (
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                        Inactive
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {type.durationMinutes} min · {bookingTypeUrl(user, type.slug).replace(/^https?:\/\//, "")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Link href={`/booking/meeting-types/${type.id}`} className="text-xs text-indigo-400 hover:text-indigo-300">
                    Edit
                  </Link>
                  <form action={toggleMeetingTypeActive.bind(null, type.id)}>
                    <button type="submit" className="text-xs text-zinc-500 transition-colors hover:text-zinc-300">
                      {type.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">
          Upcoming bookings
        </h2>
        <BookingsList bookings={upcomingBookings} timezone={user.bookingTimezone} />
      </section>

      <section className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">Recent booking activity</h2>
        <LogsPanel logs={recentLogs} />
      </section>
    </div>
  );
}
