import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

type UpcomingDeadline = {
  id: string;
  name: string;
  dueDate: Date | null;
  contact: { id: string; firstName: string; lastName: string; businessName: string | null };
};

export function DeliverySnapshotPanel({
  activeProjects,
  projectsInProgress,
  projectsOnHold,
  atRiskProjects,
  overdueProjectTasks,
  upcomingDeadlines,
}: {
  activeProjects: number;
  projectsInProgress: number;
  projectsOnHold: number;
  atRiskProjects: number;
  overdueProjectTasks: number;
  upcomingDeadlines: UpcomingDeadline[];
}) {
  return (
    <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-100">Delivery snapshot</h2>
        <Link
          href="/projects"
          className="text-xs font-medium text-zinc-500 transition-colors hover:text-indigo-400"
        >
          View projects →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            Active projects
          </p>
          <p className="mt-1 text-lg font-semibold text-zinc-50">{activeProjects}</p>
          <p className="text-[11px] text-zinc-500">
            {projectsInProgress} in progress · {projectsOnHold} on hold
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            Projects at risk
          </p>
          <p className="mt-1 text-lg font-semibold text-red-400">{atRiskProjects}</p>
          <p className="text-[11px] text-zinc-500">past due, still in progress</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            Overdue deliverables
          </p>
          <p className="mt-1 text-lg font-semibold text-red-400">{overdueProjectTasks}</p>
          <p className="text-[11px] text-zinc-500">open tasks past due</p>
        </div>
      </div>

      <div className="mt-4 border-t border-zinc-800 pt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Upcoming deadlines
        </p>
        {upcomingDeadlines.length === 0 ? (
          <EmptyState message="Nothing due soon." />
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {upcomingDeadlines.map((project) => (
              <li key={project.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <Link
                  href={`/projects/${project.id}`}
                  className="min-w-0 truncate text-zinc-200 hover:text-indigo-400"
                >
                  {project.name}
                </Link>
                <span className="shrink-0 text-xs text-zinc-500">
                  {project.dueDate && formatDate(project.dueDate)}
                  {" · "}
                  {project.contact.businessName ||
                    `${project.contact.firstName} ${project.contact.lastName}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
