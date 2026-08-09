import { prisma } from "@/lib/prisma";
import { computeProjectHealth, buildHealthInput, CLOSED_PROJECT_STATUSES } from "../projects/project-rules";

export async function getDeliverySnapshot(now: Date) {
  const activeProjects = await prisma.project.findMany({
    where: { status: { notIn: CLOSED_PROJECT_STATUSES } },
    include: {
      contact: true,
      tasks: { select: { status: true, dueDate: true } },
      milestones: { select: { dueDate: true, completedAt: true } },
      approvals: { select: { status: true } },
      timeEntries: { select: { minutes: true } },
    },
  });

  let onTrack = 0;
  let atRisk = 0;
  let blocked = 0;
  let needsAttention = 0;
  const waitingOnClient = activeProjects.filter((p) => p.status === "WAITING_ON_CLIENT").length;
  const waitingOnApproval = activeProjects.filter((p) => p.status === "WAITING_ON_APPROVAL").length;

  for (const project of activeProjects) {
    const { health } = computeProjectHealth(buildHealthInput(project, now), now);
    if (health === "ON_TRACK") onTrack++;
    else if (health === "AT_RISK") atRisk++;
    else if (health === "BLOCKED") blocked++;
    else if (health === "NEEDS_ATTENTION") needsAttention++;
  }

  const [overdueProjectTasks, upcomingDeadlines] = await Promise.all([
    prisma.task.count({
      where: {
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        projectId: { not: null },
        dueDate: { lt: now },
      },
    }),
    prisma.project.findMany({
      where: { status: { notIn: CLOSED_PROJECT_STATUSES }, targetCompletionDate: { gte: now } },
      orderBy: { targetCompletionDate: "asc" },
      take: 5,
      include: { contact: true },
    }),
  ]);

  return {
    activeProjectsCount: activeProjects.length,
    onTrack,
    needsAttention,
    atRisk,
    blocked,
    waitingOnClient,
    waitingOnApproval,
    overdueProjectTasks,
    upcomingDeadlines,
  };
}
