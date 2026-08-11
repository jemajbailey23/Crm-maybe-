import Link from "next/link";
import { BookingStatusBadge } from "@/components/ui/badge";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { cancelBookingOwner, completeBookingOwner, noShowBookingOwner } from "./actions";

type BookingRow = {
  id: string;
  startsAt: Date;
  name: string;
  email: string;
  status: string;
  meetingType: { name: string } | null;
  contact: { id: string } | null;
};

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

export function BookingsList({ bookings, timezone }: { bookings: BookingRow[]; timezone: string }) {
  if (bookings.length === 0) {
    return <p className="text-sm text-zinc-500">Nothing booked yet. Share your booking link above to get your first one.</p>;
  }

  const now = new Date().getTime();

  return (
    <ul className="divide-y divide-zinc-800/60">
      {bookings.map((booking) => {
        const isPast = booking.startsAt.getTime() < now;
        return (
          <li key={booking.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
            <div className="min-w-0">
              <p className="font-medium text-zinc-100">
                {formatDateTime(booking.startsAt, timezone)}
                {booking.meetingType && <span className="ml-2 text-xs text-zinc-500">{booking.meetingType.name}</span>}
              </p>
              <p className="truncate text-zinc-500">
                {booking.contact ? (
                  <Link href={`/contacts/${booking.contact.id}`} className="hover:text-indigo-400">
                    {booking.name}
                  </Link>
                ) : (
                  booking.name
                )}{" "}
                · {booking.email}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <BookingStatusBadge status={booking.status} />
              {booking.status === "CONFIRMED" && (
                <>
                  {isPast && (
                    <>
                      <form action={completeBookingOwner.bind(null, booking.id)}>
                        <button type="submit" className="text-xs text-zinc-500 transition-colors hover:text-emerald-400">
                          Completed
                        </button>
                      </form>
                      <form action={noShowBookingOwner.bind(null, booking.id)}>
                        <button type="submit" className="text-xs text-zinc-500 transition-colors hover:text-amber-400">
                          No-show
                        </button>
                      </form>
                    </>
                  )}
                  <form action={cancelBookingOwner.bind(null, booking.id, undefined)}>
                    <ConfirmSubmitButton
                      confirmMessage={`Cancel the booking with ${booking.name}?`}
                      className="text-xs text-zinc-600 transition-colors hover:text-red-400"
                    >
                      Cancel
                    </ConfirmSubmitButton>
                  </form>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
