import "server-only";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";

// Generates real Task/TaskDependency/ProjectApproval rows from a
// ProjectTemplate's blueprint. Called once, at project creation, when a
// template was selected — editing the template afterward never
// retroactively changes projects already created from it.
export async function applyProjectTemplate(projectId: string, templateId: string, projectStartDate: Date | null) {
  const template = await prisma.projectTemplate.findUnique({
    where: { id: templateId },
    include: {
      tasks: { orderBy: { order: "asc" } },
      approvals: { orderBy: { order: "asc" } },
    },
  });
  if (!template) return;

  const baseDate = projectStartDate ?? new Date();

  // Pass 1: create every task first (dependencies reference sibling
  // template tasks, which need real Task ids to exist before they can be
  // wired up).
  const idMap = new Map<string, string>();
  for (const templateTask of template.tasks) {
    const dueDate = templateTask.dueDateOffsetDays != null ? addDays(baseDate, templateTask.dueDateOffsetDays) : null;
    const task = await prisma.task.create({
      data: {
        title: templateTask.title,
        description: templateTask.description,
        dueDate,
        projectId,
        isQualityControl: templateTask.isQualityControl,
        requiresEvidence: templateTask.requiresEvidence,
      },
    });
    idMap.set(templateTask.id, task.id);
  }

  // Pass 2: wire up dependencies now that every task exists.
  for (const templateTask of template.tasks) {
    if (!templateTask.dependsOnId) continue;
    const taskId = idMap.get(templateTask.id);
    const dependsOnTaskId = idMap.get(templateTask.dependsOnId);
    if (taskId && dependsOnTaskId) {
      await prisma.taskDependency.create({ data: { taskId, dependsOnTaskId } });
    }
  }

  for (const templateApproval of template.approvals) {
    await prisma.projectApproval.create({
      data: { projectId, label: templateApproval.label },
    });
  }
}
