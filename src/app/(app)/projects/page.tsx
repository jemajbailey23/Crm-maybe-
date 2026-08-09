import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma, ProjectStatus } from "@prisma/client";
import { PriorityBadge, ProjectHealthBadge } from "@/components/ui/badge";
import { SearchBox } from "@/components/search-box";
import { ProjectStatusSelect } from "./project-status-select";
import { ProjectFilters } from "./project-filters";
import { computeProjectHealth, buildHealthInput } from "./project-rules";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

const STATUSES: { value: ProjectStatus; label: string; dot: string }[] = [
  { value: "NOT_STARTED", label: "Not started", dot: "bg-zinc-500" },
  { value: "PLANNING", label: "Planning", dot: "bg-zinc-500" },
  { value: "IN_PROGRESS", label: "In progress", dot: "bg-blue-500" },
  { value: "WAITING_ON_CLIENT", label: "Waiting on client", dot: "bg-amber-500" },
  { value: "WAITING_ON_APPROVAL", label: "Waiting on approval", dot: "bg-amber-500" },
  { value: "BLOCKED", label: "Blocked", dot: "bg-red-500" },
  { value: "QUALITY_REVIEW", label: "Quality review", dot: "bg-violet-500" },
  { value: "COMPLETED", label: "Completed", dot: "bg-emerald-500" },
  { value: "PAUSED", label: "Paused", dot: "bg-zinc-500" },
  { value: "CANCELLED", label: "Cancelled", dot: "bg-zinc-500" },
];

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; owner?: string; company?: string; health?: string }>;
}) {
  const { q, owner, company, health } = await searchParams;

  const andClauses: Prisma.ProjectWhereInput[] = [];
  if (q) {
    andClauses.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { contact: { firstName: { contains: q, mode: "insensitive" } } },
        { contact: { lastName: { contains: q, mode: "insensitive" } } },
        { contact: { businessName: { contains: q, mode: "insensitive" } } },
      ],
    });
  }
  if (owner === "unassigned") andClauses.push({ ownerId: null });
  else if (owner) andClauses.push({ ownerId: owner });
  if (company) andClauses.push({ companyId: company });

  const where: Prisma.ProjectWhereInput = andClauses.length > 0 ? { AND: andClauses } : {};

  const [projects, owners, companies] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        contact: true,
        owner: { select: { id: true, name: true } },
        tasks: { select: { status: true, dueDate: true } },
        milestones: { select: { dueDate: true, completedAt: true } },
        approvals: { select: { status: true } },
        timeEntries: { select: { minutes: true } },
      },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const now = new Date();
  let enrichedProjects = projects.map((project) => ({
    ...project,
    ...computeProjectHealth(buildHealthInput(project, now), now),
  }));

  if (health) {
    enrichedProjects = enrichedProjects.filter((p) => p.health === health);
  }

  const projectsByStatus = Object.fromEntries(STATUSES.map((s) => [s.value, enrichedProjects.filter((p) => p.status === s.value)]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Projects</h1>
          <p className="mt-1 text-sm text-zinc-500">Track client work from kickoff through delivery.</p>
        </div>
        <Link
          href="/projects/new"
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400"
        >
          New project
        </Link>
      </div>

      <Suspense>
        <SearchBox key={q ?? ""} placeholder="Search projects…" />
      </Suspense>

      <Suspense>
        <ProjectFilters owners={owners} companies={companies} />
      </Suspense>

      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <div className="flex gap-4" style={{ width: "max-content" }}>
          {STATUSES.map((statusOpt) => {
            const statusProjects = projectsByStatus[statusOpt.value];
            return (
              <div
                key={statusOpt.value}
                className="animate-slide-up flex w-72 shrink-0 flex-col rounded-xl border border-zinc-800 bg-zinc-900/40"
              >
                <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2.5">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusOpt.dot}`} />
                  <p className="text-sm font-semibold text-zinc-100">{statusOpt.label}</p>
                  <span className="ml-auto rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                    {statusProjects.length}
                  </span>
                </div>
                <div className="flex-1 space-y-2 p-2">
                  {statusProjects.length === 0 ? (
                    <p className="px-1 py-2 text-xs text-zinc-600">Empty</p>
                  ) : (
                    statusProjects.map((project) => (
                      <div
                        key={project.id}
                        className="group rounded-lg border border-zinc-800 bg-zinc-900 p-2.5 transition-all duration-150 hover:-translate-y-0.5 hover:border-zinc-700 hover:shadow-lg hover:shadow-black/20"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/projects/${project.id}`}
                            className="block text-sm font-medium text-zinc-100 group-hover:text-indigo-400"
                          >
                            {project.name}
                          </Link>
                          <PriorityBadge priority={project.priority} />
                        </div>
                        <p className="truncate text-xs text-zinc-500">
                          {project.contact.businessName || `${project.contact.firstName} ${project.contact.lastName}`}
                        </p>
                        {project.owner && <p className="mt-0.5 truncate text-[11px] text-zinc-600">{project.owner.name}</p>}
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-linear-to-r from-indigo-500 to-violet-500"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-xs text-zinc-500">
                          <span>{project.progress}%</span>
                          {project.targetCompletionDate && <span>Due {formatDate(project.targetCompletionDate)}</span>}
                        </div>
                        <div className="mt-1.5">
                          <ProjectHealthBadge health={project.health} />
                        </div>
                        <div className="mt-2">
                          <ProjectStatusSelect projectId={project.id} status={project.status} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
