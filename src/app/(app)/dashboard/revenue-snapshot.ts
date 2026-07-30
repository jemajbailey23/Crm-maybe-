import { prisma } from "@/lib/prisma";

// Matches the Financials page's methodology exactly (Service + Invoice based)
// so the dashboard and /financials never disagree on what "MRR" means.
export async function getRevenueSnapshot(now: Date, startOfMonth: Date) {
  const [services, invoices, totalClients, revenueGoal] = await Promise.all([
    prisma.service.findMany({
      select: { billingType: true, amount: true, createdAt: true },
    }),
    prisma.invoice.findMany({
      select: { amount: true, status: true, paidAt: true, dueDate: true },
    }),
    prisma.contact.count({ where: { status: "CLIENT" } }),
    prisma.goal.findFirst({ where: { metric: "REVENUE", period: "MONTHLY" } }),
  ]);

  const mrr = services
    .filter((s) => s.billingType === "MONTHLY" && s.createdAt <= now)
    .reduce((sum, s) => sum + (s.amount ?? 0), 0);

  const oneTimeThisMonth = invoices
    .filter((i) => i.status === "PAID" && i.paidAt && i.paidAt >= startOfMonth)
    .reduce((sum, i) => sum + i.amount, 0);

  const revenueThisMonth = mrr + oneTimeThisMonth;

  const outstandingInvoices = invoices.filter(
    (i) => i.status === "SENT" || i.status === "OVERDUE"
  );
  const outstandingValue = outstandingInvoices.reduce((sum, i) => sum + i.amount, 0);

  const overdueInvoices = invoices.filter(
    (i) => i.status === "OVERDUE" || (i.status === "SENT" && i.dueDate && i.dueDate < now)
  );
  const overdueValue = overdueInvoices.reduce((sum, i) => sum + i.amount, 0);

  const goalProgressPercent =
    revenueGoal && revenueGoal.target > 0
      ? Math.round((revenueThisMonth / revenueGoal.target) * 100)
      : null;

  return {
    mrr,
    oneTimeThisMonth,
    revenueThisMonth,
    outstandingValue,
    outstandingCount: outstandingInvoices.length,
    overdueValue,
    overdueCount: overdueInvoices.length,
    totalClients,
    goalTarget: revenueGoal?.target ?? null,
    goalProgressPercent,
  };
}
