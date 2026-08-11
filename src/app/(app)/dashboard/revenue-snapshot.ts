import { prisma } from "@/lib/prisma";
import {
  mrrAsOf,
  cashCollected,
  oneTimeRevenueCollected,
  outstandingInvoiceTotal,
  overdueInvoiceTotal,
} from "@/lib/finance-calculations";

// Bugfix: this used to hand-roll its own "revenueThisMonth = mrr +
// oneTimeThisMonth" formula instead of using finance-calculations.ts —
// the exact single-source-of-truth module Stage 6 built specifically so
// Financials/Performance/Dashboard could never disagree about what
// "revenue" means. This module's own header comment already claimed
// dashboard as a consumer; it just wasn't actually wired up. Now it is.
export async function getRevenueSnapshot(now: Date, startOfMonth: Date, endOfMonth: Date) {
  const [services, invoices, totalClients, revenueGoal] = await Promise.all([
    prisma.service.findMany({
      select: { billingType: true, amount: true, createdAt: true, endedAt: true },
    }),
    prisma.invoice.findMany({
      select: {
        amount: true,
        status: true,
        paidAt: true,
        issuedDate: true,
        dueDate: true,
        createdAt: true,
        refundedAmount: true,
        isRecurring: true,
        contactId: true,
      },
    }),
    prisma.contact.count({ where: { status: "CLIENT" } }),
    prisma.goal.findFirst({ where: { metric: "REVENUE", period: "MONTHLY" } }),
  ]);

  const mrr = mrrAsOf(services, now);
  const oneTimeThisMonth = oneTimeRevenueCollected(invoices, startOfMonth, endOfMonth);
  const revenueThisMonth = cashCollected(invoices, startOfMonth, endOfMonth);

  const outstandingValue = outstandingInvoiceTotal(invoices);
  const outstandingCount = invoices.filter((i) => i.status === "SENT" || i.status === "OVERDUE").length;

  const overdueValue = overdueInvoiceTotal(invoices, now);
  const overdueCount = invoices.filter(
    (i) => i.status === "OVERDUE" || (i.status === "SENT" && i.dueDate && i.dueDate < now)
  ).length;

  const goalProgressPercent =
    revenueGoal && revenueGoal.target > 0
      ? Math.round((revenueThisMonth / revenueGoal.target) * 100)
      : null;

  return {
    mrr,
    oneTimeThisMonth,
    revenueThisMonth,
    outstandingValue,
    outstandingCount,
    overdueValue,
    overdueCount,
    totalClients,
    goalTarget: revenueGoal?.target ?? null,
    goalProgressPercent,
  };
}
