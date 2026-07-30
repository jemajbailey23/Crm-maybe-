import { prisma } from "@/lib/prisma";

export async function getDeliverySnapshot(now: Date) {
  const [
    activeProjects,
    projectsInProgress,
    projectsOnHold,
    atRiskProjects,
    overdueProjectTasks,
    upcomingDeadlines,
  ] = await Promise.all([
    prisma.project.count({ where: { status: { not: "COMPLETED" } } }),
    prisma.project.count({ where: { status: "IN_PROGRESS" } }),
    prisma.project.count({ where: { status: "ON_HOLD" } }),
    prisma.project.count({ where: { status: "IN_PROGRESS", dueDate: { lt: now } } }),
    prisma.task.count({
      where: { status: "OPEN", projectId: { not: null }, dueDate: { lt: now } },
    }),
    prisma.project.findMany({
      where: { status: { not: "COMPLETED" }, dueDate: { gte: now } },
      orderBy: { dueDate: "asc" },
      take: 5,
      include: { contact: true },
    }),
  ]);

  return {
    activeProjects,
    projectsInProgress,
    projectsOnHold,
    atRiskProjects,
    overdueProjectTasks,
    upcomingDeadlines,
  };
}
