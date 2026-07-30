import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";

function formatDateTime(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
    timeZoneName: "short",
  }).format(date);
}

type UpcomingMeeting = {
  id: string;
  startsAt: Date;
  name: string;
  email: string;
  contact: { id: string } | null;
};

export function UpcomingMeetingsPanel({
  meetings,
  timezone,
}: {
  meetings: UpcomingMeeting[];
  timezone: string;
}) {
  return (
    <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-100">
          Upcoming meetings
          {meetings.length > 0 && (
            <span className="ml-2 rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400">
              {meetings.length}
            </span>
          )}
        </h2>
        <Link
          href="/booking"
          className="text-xs font-medium text-zinc-500 transition-colors hover:text-indigo-400"
        >
          Manage →
        </Link>
      </div>
      {meetings.length === 0 ? (
        <EmptyState
          message="Nothing booked yet."
          actionLabel="Share your booking link"
          actionHref="/booking"
        />
      ) : (
        <ul className="divide-y divide-zinc-800/60">
          {meetings.map((meeting) => (
            <li key={meeting.id} className="py-2.5 text-sm">
              <p className="font-medium text-zinc-200">
                {formatDateTime(meeting.startsAt, timezone)}
              </p>
              <p className="truncate text-xs text-zinc-500">
                {meeting.contact ? (
                  <Link href={`/contacts/${meeting.contact.id}`} className="hover:text-indigo-400">
                    {meeting.name}
                  </Link>
                ) : (
                  meeting.name
                )}{" "}
                · {meeting.email}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
