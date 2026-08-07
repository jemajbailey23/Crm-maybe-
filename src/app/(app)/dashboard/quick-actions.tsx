import Link from "next/link";

const PRIMARY = { label: "+ Add Lead", href: "/contacts/new?status=LEAD" };

const SHORTCUTS = [
  { label: "Add Client", href: "/contacts/new?status=CLIENT" },
  { label: "Create Proposal", href: "/deals/new?stage=PROPOSAL" },
  { label: "Start Audit", href: "/deals/new?title=Growth+Audit" },
  { label: "Create Invoice", href: "/deals?stage=WON" },
  { label: "Schedule Meeting", href: "/book" },
  { label: "New Task", href: "/tasks/new" },
];

export function QuickActions() {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-zinc-100">Quick actions</h2>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={PRIMARY.href}
          className="animate-slide-up rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400"
        >
          {PRIMARY.label}
        </Link>
        {SHORTCUTS.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="animate-slide-up rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-indigo-500/40 hover:text-indigo-300"
          >
            {s.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
