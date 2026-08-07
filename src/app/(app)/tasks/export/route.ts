import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { rowsToCsv, csvResponse } from "@/lib/csv";
import { startOfDayInZone, endOfDayInZone } from "@/lib/timezone";

export async function GET(request: Request) {
  const user = await requireUser();
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") ?? "active";
  const idsParam = searchParams.get("ids");

  const tasks = await prisma.task.findMany({
    where: idsParam ? { id: { in: idsParam.split(",").filter(Boolean) } } : undefined,
    orderBy: [{ dueDate: "asc" }],
    include: {
      contact: { select: { firstName: true, lastName: true, businessName: true } },
      company: { select: { name: true } },
      deal: { select: { title: true } },
      project: { select: { name: true } },
      invoice: { select: { description: true } },
      assignedTo: { select: { name: true } },
    },
  });

  let filtered = tasks;
  if (!idsParam) {
    const now = new Date();
    const startOfToday = startOfDayInZone(now, user.bookingTimezone);
    const endOfToday = endOfDayInZone(now, user.bookingTimezone);
    const isOpen = (t: (typeof tasks)[number]) => t.status !== "COMPLETED" && t.status !== "CANCELLED";

    switch (view) {
      case "today":
        filtered = tasks.filter((t) => isOpen(t) && t.dueDate && t.dueDate >= startOfToday && t.dueDate <= endOfToday);
        break;
      case "overdue":
        filtered = tasks.filter((t) => isOpen(t) && t.dueDate && t.dueDate < startOfToday);
        break;
      case "upcoming":
        filtered = tasks.filter((t) => isOpen(t) && t.dueDate && t.dueDate > endOfToday);
        break;
      case "by-client":
        filtered = tasks.filter((t) => isOpen(t) && t.contact);
        break;
      case "by-project":
        filtered = tasks.filter((t) => isOpen(t) && t.project);
        break;
      case "by-deal":
        filtered = tasks.filter((t) => isOpen(t) && t.deal);
        break;
      case "waiting":
        filtered = tasks.filter((t) => t.status === "WAITING");
        break;
      case "blocked":
        filtered = tasks.filter((t) => t.status === "BLOCKED");
        break;
      case "review":
        filtered = tasks.filter((t) => t.status === "REVIEW");
        break;
      case "completed":
        filtered = tasks.filter((t) => t.status === "COMPLETED");
        break;
      default:
        filtered = tasks.filter((t) => t.status !== "COMPLETED");
    }
  }

  const headers = [
    "Title",
    "Status",
    "Priority",
    "Start date",
    "Due date",
    "Completed date",
    "Assigned owner",
    "Contact",
    "Company",
    "Deal",
    "Project",
    "Invoice",
    "Recurrence",
    "Estimated minutes",
    "Tracked minutes",
    "Waiting reason",
    "Blocked reason",
    "Created",
  ];

  const rows = filtered.map((t) => [
    t.title,
    t.status,
    t.priority,
    t.startDate ? t.startDate.toISOString().slice(0, 10) : "",
    t.dueDate ? t.dueDate.toISOString().slice(0, 10) : "",
    t.completedAt ? t.completedAt.toISOString().slice(0, 10) : "",
    t.assignedTo?.name,
    t.contact ? t.contact.businessName || `${t.contact.firstName} ${t.contact.lastName}` : "",
    t.company?.name,
    t.deal?.title,
    t.project?.name,
    t.invoice?.description,
    t.recurrence,
    t.estimatedMinutes,
    t.trackedMinutes,
    t.waitingReason,
    t.blockedReason,
    t.createdAt.toISOString().slice(0, 10),
  ]);

  return csvResponse(rowsToCsv(headers, rows), "tasks");
}
