import { describe, it, expect } from "vitest";
import {
  netAmount,
  cashCollected,
  invoicedRevenue,
  oneTimeRevenueCollected,
  recurringRevenueCollected,
  mrrAsOf,
  newMrr,
  expansionMrr,
  contractionMrr,
  churnedMrr,
  netMrrGrowth,
  outstandingInvoiceTotal,
  overdueInvoiceTotal,
  totalRefunds,
  failedPaymentsSummary,
  closedDealValue,
  clientValueMetrics,
  estimatedGrossProfit,
  type InvoiceRow,
  type ServiceRow,
  type MrrEventRow,
  type DealRow,
} from "@/lib/finance-calculations";

// These are pure-function unit tests — no database involved. They exercise
// the exact formulas documented in finance-calculations.ts against
// hand-built fixtures, so the "audit every metric" requirement has
// executable proof behind it, not just comments.

const day = (offsetDays: number, base = new Date("2026-06-15T12:00:00Z")) =>
  new Date(base.getTime() + offsetDays * 24 * 60 * 60 * 1000);

function invoice(overrides: Partial<InvoiceRow> = {}): InvoiceRow {
  return {
    amount: 1000,
    status: "PAID",
    paidAt: day(0),
    issuedDate: day(-2),
    dueDate: day(5),
    createdAt: day(-3),
    refundedAmount: 0,
    isRecurring: false,
    contactId: "contact-1",
    ...overrides,
  };
}

const MONTH_START = new Date("2026-06-01T00:00:00Z");
const MONTH_END = new Date("2026-06-30T23:59:59Z");

describe("netAmount", () => {
  it("subtracts refunds from the invoice amount", () => {
    expect(netAmount({ amount: 1000, refundedAmount: 300 })).toBe(700);
  });
});

describe("cashCollected — paid invoices, source of truth", () => {
  it("sums only PAID invoices within range, net of refunds", () => {
    const invoices = [
      invoice({ amount: 1000, refundedAmount: 0 }), // full payment
      invoice({ amount: 500, refundedAmount: 200 }), // partial refund
      invoice({ status: "SENT", paidAt: null, amount: 999 }), // not paid — excluded
      invoice({ paidAt: day(-40), amount: 999 }), // paid outside range — excluded
    ];
    // 1000 + (500 - 200) = 1300
    expect(cashCollected(invoices, MONTH_START, MONTH_END)).toBe(1300);
  });

  it("never includes won-deal value — only takes an Invoice array", () => {
    // Structural proof: cashCollected's signature accepts no Deal data at
    // all, so a won deal literally cannot contribute to this figure.
    const invoices = [invoice({ amount: 250 })];
    expect(cashCollected(invoices, MONTH_START, MONTH_END)).toBe(250);
  });

  it("handles a fully refunded (partial payment reversed to zero) invoice", () => {
    const invoices = [invoice({ amount: 800, refundedAmount: 800 })];
    expect(cashCollected(invoices, MONTH_START, MONTH_END)).toBe(0);
  });
});

describe("invoicedRevenue — gross billed volume, any status", () => {
  it("sums by issuedDate regardless of paid status", () => {
    const invoices = [
      invoice({ amount: 500, status: "PAID", issuedDate: day(0) }),
      invoice({ amount: 700, status: "SENT", issuedDate: day(1) }),
      invoice({ amount: 300, status: "OVERDUE", issuedDate: day(-40) }), // outside range
    ];
    expect(invoicedRevenue(invoices, MONTH_START, MONTH_END)).toBe(1200);
  });

  it("falls back to createdAt when issuedDate is null", () => {
    const invoices = [invoice({ amount: 400, issuedDate: null, createdAt: day(0) })];
    expect(invoicedRevenue(invoices, MONTH_START, MONTH_END)).toBe(400);
  });
});

describe("oneTimeRevenueCollected / recurringRevenueCollected", () => {
  it("splits collected cash by isRecurring, summing back to cashCollected", () => {
    const invoices = [
      invoice({ amount: 1000, isRecurring: false }),
      invoice({ amount: 400, isRecurring: true }),
      invoice({ amount: 100, isRecurring: true, refundedAmount: 20 }),
    ];
    const oneTime = oneTimeRevenueCollected(invoices, MONTH_START, MONTH_END);
    const recurring = recurringRevenueCollected(invoices, MONTH_START, MONTH_END);
    expect(oneTime).toBe(1000);
    expect(recurring).toBe(400 + 80);
    expect(oneTime + recurring).toBe(cashCollected(invoices, MONTH_START, MONTH_END));
  });
});

describe("mrrAsOf — point-in-time run-rate snapshot", () => {
  const services: ServiceRow[] = [
    { billingType: "MONTHLY", amount: 200, createdAt: day(-60), endedAt: null }, // still active
    { billingType: "MONTHLY", amount: 150, createdAt: day(-60), endedAt: day(-10) }, // ended before asOf
    { billingType: "MONTHLY", amount: 300, createdAt: day(5), endedAt: null }, // starts after asOf
    { billingType: "ONE_TIME", amount: 999, createdAt: day(-60), endedAt: null }, // not MRR
  ];

  it("counts only active MONTHLY services as of the given date", () => {
    expect(mrrAsOf(services, day(0))).toBe(200);
  });

  it("a canceled subscription still counts before its endedAt (historical MRR)", () => {
    expect(mrrAsOf(services, day(-30))).toBe(200 + 150);
  });
});

describe("MRR movement — new/expansion/contraction/churn", () => {
  const events: MrrEventRow[] = [
    { type: "NEW", amountDelta: 200, occurredAt: day(2) },
    { type: "EXPANSION", amountDelta: 50, occurredAt: day(5) },
    { type: "CONTRACTION", amountDelta: -30, occurredAt: day(8) },
    { type: "CHURN", amountDelta: -100, occurredAt: day(12) },
    { type: "NEW", amountDelta: 999, occurredAt: day(-40) }, // outside range
  ];

  it("newMrr sums NEW events in range", () => {
    expect(newMrr(events, MONTH_START, MONTH_END)).toBe(200);
  });
  it("expansionMrr sums EXPANSION events in range", () => {
    expect(expansionMrr(events, MONTH_START, MONTH_END)).toBe(50);
  });
  it("contractionMrr returns a positive magnitude", () => {
    expect(contractionMrr(events, MONTH_START, MONTH_END)).toBe(30);
  });
  it("churnedMrr returns a positive magnitude", () => {
    expect(churnedMrr(events, MONTH_START, MONTH_END)).toBe(100);
  });
  it("netMrrGrowth = new + expansion - contraction - churn", () => {
    // 200 + 50 - 30 - 100 = 120
    expect(netMrrGrowth(events, MONTH_START, MONTH_END)).toBe(120);
  });
});

describe("outstanding / overdue invoice totals", () => {
  it("outstandingInvoiceTotal sums SENT and OVERDUE, gross", () => {
    const invoices = [
      invoice({ status: "SENT", amount: 100 }),
      invoice({ status: "OVERDUE", amount: 200 }),
      invoice({ status: "PAID", amount: 999 }),
      invoice({ status: "DRAFT", amount: 999 }),
    ];
    expect(outstandingInvoiceTotal(invoices)).toBe(300);
  });

  it("overdueInvoiceTotal includes SENT invoices past their due date", () => {
    const now = day(0);
    const invoices = [
      invoice({ status: "OVERDUE", amount: 50 }),
      invoice({ status: "SENT", dueDate: day(-1, now), amount: 75 }), // past due, not flipped yet
      invoice({ status: "SENT", dueDate: day(10, now), amount: 999 }), // not due yet
    ];
    expect(overdueInvoiceTotal(invoices, now)).toBe(125);
  });
});

describe("totalRefunds and failedPaymentsSummary", () => {
  it("totalRefunds sums refundedAmount across all invoices", () => {
    const invoices = [invoice({ refundedAmount: 50 }), invoice({ refundedAmount: 0 }), invoice({ refundedAmount: 25 })];
    expect(totalRefunds(invoices)).toBe(75);
  });

  it("failedPaymentsSummary counts and totals", () => {
    const result = failedPaymentsSummary([{ amount: 100 }, { amount: 50 }]);
    expect(result).toEqual({ count: 2, total: 150 });
  });

  it("failedPaymentsSummary handles zero failures", () => {
    expect(failedPaymentsSummary([])).toEqual({ count: 0, total: 0 });
  });
});

describe("closedDealValue — never counted as revenue", () => {
  it("sums WON deals in range, ignoring LOST and out-of-range deals", () => {
    const deals: DealRow[] = [
      { stage: "WON", oneTimeValue: 500, mrrValue: 100, wonAt: day(0) },
      { stage: "WON", oneTimeValue: 200, mrrValue: null, wonAt: day(-40) }, // outside range
      { stage: "LOST", oneTimeValue: 999, mrrValue: 999, wonAt: null },
    ];
    expect(closedDealValue(deals, MONTH_START, MONTH_END)).toBe(600);
  });
});

describe("clientValueMetrics — collected revenue only, no deal double-counting", () => {
  it("computes average/lifetime client value from PAID invoices only", () => {
    const invoices = [
      invoice({ contactId: "a", amount: 1000, refundedAmount: 0 }),
      invoice({ contactId: "a", amount: 500, refundedAmount: 100 }),
      invoice({ contactId: "b", amount: 300 }),
      invoice({ contactId: "c", status: "SENT", paidAt: null, amount: 99999 }), // unpaid, excluded
    ];
    const result = clientValueMetrics(invoices);
    // total collected: (1000) + (500-100) + 300 = 1700, across 2 paying clients
    expect(result.totalCollected).toBe(1700);
    expect(result.payingClientCount).toBe(2);
    expect(result.averageClientValue).toBe(850);
    expect(result.lifetimeClientValue).toBe(850);
  });

  it("returns null average (not zero or NaN) when nobody has paid", () => {
    const result = clientValueMetrics([invoice({ status: "SENT", paidAt: null })]);
    expect(result.averageClientValue).toBeNull();
    expect(result.payingClientCount).toBe(0);
  });
});

describe("estimatedGrossProfit — clearly an estimate, not accounting profit", () => {
  it("multiplies cash collected by the margin percentage", () => {
    expect(estimatedGrossProfit(1000, 40)).toBe(400);
  });
  it("returns 0 at 0% margin and full amount at 100% margin", () => {
    expect(estimatedGrossProfit(1000, 0)).toBe(0);
    expect(estimatedGrossProfit(1000, 100)).toBe(1000);
  });
});
