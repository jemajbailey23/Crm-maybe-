import { describe, it, expect, vi, afterAll, beforeEach } from "vitest";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";

// These are real-database integration tests — they write to and read from
// the actual dev Postgres database (via tests/setup.ts loading the same
// DATABASE_URL the app uses), matching this codebase's established
// convention of testing against real data rather than mocking Prisma.
// The only things mocked are genuinely external side effects that must
// never fire for real during a test run: outbound automation
// emails/webhooks, and live calls to the real Stripe API.
const fireAutomationTrigger = vi.fn();
vi.mock("@/lib/automations", () => ({
  fireAutomationTrigger: (...args: unknown[]) => fireAutomationTrigger(...args),
}));

const stripeInvoicesRetrieve = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripeClient: () => ({ invoices: { retrieve: stripeInvoicesRetrieve } }),
  isStripeConfigured: () => true,
}));

const {
  syncStripeInvoice,
  syncStripeRefund,
  syncStripeFailedPayment,
  syncStripeSubscription,
} = await import("@/lib/stripe-sync");

const RUN_ID = `test${Date.now()}${Math.floor(Math.random() * 10000)}`;
const customerId = `cus_${RUN_ID}`;
const createdContactIds: string[] = [];

function fakeInvoice(overrides: Partial<Stripe.Invoice> = {}): Stripe.Invoice {
  return {
    id: `in_${RUN_ID}`,
    customer: customerId,
    customer_email: `${RUN_ID}@example.com`,
    customer_name: "Test Customer",
    amount_paid: 150000, // $1500.00
    amount_due: 150000,
    description: "Website redesign",
    lines: { data: [] },
    due_date: null,
    status_transitions: { paid_at: Math.floor(Date.now() / 1000) },
    created: Math.floor(Date.now() / 1000),
    attempt_count: 1,
    last_finalization_error: null,
    parent: null,
    ...overrides,
  } as unknown as Stripe.Invoice;
}

function fakeSubscription(overrides: Partial<Stripe.Subscription> = {}): Stripe.Subscription {
  return {
    id: `sub_${RUN_ID}`,
    customer: customerId,
    status: "active",
    canceled_at: null,
    ended_at: null,
    items: {
      data: [
        {
          price: {
            unit_amount: 20000, // $200.00/mo
            nickname: "Pro plan",
            recurring: { interval: "month" },
            product: "prod_test",
          },
        },
      ],
    },
    ...overrides,
  } as unknown as Stripe.Subscription;
}

async function findContact() {
  return prisma.contact.findUnique({ where: { stripeCustomerId: customerId } });
}

beforeEach(() => {
  fireAutomationTrigger.mockClear();
  stripeInvoicesRetrieve.mockReset();
});

afterAll(async () => {
  // Cascade deletes clean up each contact's Invoice/Service/ServiceMrrEvent
  // rows automatically (onDelete: Cascade in schema.prisma); FailedPayment
  // only SETs NULL on delete, so it's cleaned up explicitly.
  await prisma.failedPayment.deleteMany({ where: { stripeInvoiceId: { contains: RUN_ID } } });
  if (createdContactIds.length > 0) {
    await prisma.contact.deleteMany({ where: { id: { in: createdContactIds } } });
  }
});

describe("syncStripeInvoice — paid invoices are the source of truth", () => {
  it("creates a PAID invoice, promotes the contact to CLIENT, and fires INVOICE_PAID once", async () => {
    await syncStripeInvoice(fakeInvoice(), "PAID");

    const contact = await findContact();
    expect(contact).not.toBeNull();
    createdContactIds.push(contact!.id);
    expect(contact!.status).toBe("CLIENT");

    const invoice = await prisma.invoice.findUnique({ where: { stripeInvoiceId: `in_${RUN_ID}` } });
    expect(invoice).not.toBeNull();
    expect(invoice!.status).toBe("PAID");
    expect(invoice!.amount).toBe(1500);
    expect(invoice!.paidAt).not.toBeNull();

    expect(fireAutomationTrigger).toHaveBeenCalledTimes(1);
    expect(fireAutomationTrigger).toHaveBeenCalledWith(
      "INVOICE_PAID",
      expect.objectContaining({ contactId: contact!.id })
    );
  });

  it("upserts by stripeInvoiceId — a redelivered event updates the same row, not a second one", async () => {
    // Same stripeInvoiceId as the previous test, delivered again (a real
    // Stripe redelivery scenario) with a slightly different amount.
    await syncStripeInvoice(fakeInvoice({ amount_paid: 150000 }), "PAID");

    const invoices = await prisma.invoice.findMany({ where: { stripeInvoiceId: `in_${RUN_ID}` } });
    expect(invoices).toHaveLength(1);
  });

  it("marks isRecurring from the invoice's generating subscription", async () => {
    const recurringInvoiceId = `in_recurring_${RUN_ID}`;
    await syncStripeInvoice(
      fakeInvoice({
        id: recurringInvoiceId,
        parent: { subscription_details: { subscription: `sub_${RUN_ID}` } },
      } as Partial<Stripe.Invoice>),
      "PAID"
    );
    const invoice = await prisma.invoice.findUnique({ where: { stripeInvoiceId: recurringInvoiceId } });
    expect(invoice!.isRecurring).toBe(true);
  });
});

describe("syncStripeRefund — partial and full refunds", () => {
  it("nets a partial refund against the invoice via Stripe's own running total", async () => {
    stripeInvoicesRetrieve.mockResolvedValue({ post_payment_credit_notes_amount: 50000 }); // $500 refunded

    await syncStripeRefund({ invoice: `in_${RUN_ID}` } as unknown as Stripe.CreditNote);

    const invoice = await prisma.invoice.findUnique({ where: { stripeInvoiceId: `in_${RUN_ID}` } });
    expect(invoice!.refundedAmount).toBe(500);
    expect(invoice!.refundedAt).not.toBeNull();
    // Still PAID — a partial refund doesn't change the status, only nets
    // out of the revenue figure via netAmount() (amount - refundedAmount).
    expect(invoice!.status).toBe("PAID");
  });

  it("is idempotent across a replayed credit_note webhook", async () => {
    stripeInvoicesRetrieve.mockResolvedValue({ post_payment_credit_notes_amount: 50000 });
    await syncStripeRefund({ invoice: `in_${RUN_ID}` } as unknown as Stripe.CreditNote);

    const invoice = await prisma.invoice.findUnique({ where: { stripeInvoiceId: `in_${RUN_ID}` } });
    // Still $500, not $1000 — re-fetching Stripe's running total each time
    // (rather than summing deltas locally) is what makes this safe to
    // replay.
    expect(invoice!.refundedAmount).toBe(500);
  });

  it("does nothing for an invoice the CRM isn't tracking", async () => {
    await syncStripeRefund({ invoice: `in_unknown_${RUN_ID}` } as unknown as Stripe.CreditNote);
    expect(stripeInvoicesRetrieve).not.toHaveBeenCalled();
  });
});

describe("syncStripeFailedPayment", () => {
  it("records a failed payment attempt", async () => {
    await syncStripeFailedPayment(
      fakeInvoice({ id: `in_failed_${RUN_ID}`, amount_due: 25000, attempt_count: 1 })
    );
    const failure = await prisma.failedPayment.findUnique({
      where: { stripeChargeId: `in_failed_${RUN_ID}:attempt1` },
    });
    expect(failure).not.toBeNull();
    expect(failure!.amount).toBe(250);
  });

  it("dedupes a redelivered webhook for the same attempt", async () => {
    await syncStripeFailedPayment(
      fakeInvoice({ id: `in_failed_${RUN_ID}`, amount_due: 25000, attempt_count: 1 })
    );
    const failures = await prisma.failedPayment.findMany({
      where: { stripeInvoiceId: `in_failed_${RUN_ID}` },
    });
    expect(failures).toHaveLength(1);
  });

  it("records a second row for a genuinely new retry attempt", async () => {
    await syncStripeFailedPayment(
      fakeInvoice({ id: `in_failed_${RUN_ID}`, amount_due: 25000, attempt_count: 2 })
    );
    const failures = await prisma.failedPayment.findMany({
      where: { stripeInvoiceId: `in_failed_${RUN_ID}` },
    });
    expect(failures).toHaveLength(2);
  });
});

describe("syncStripeSubscription — MRR lifecycle events", () => {
  it("activation records a NEW MRR event", async () => {
    await syncStripeSubscription(fakeSubscription({ status: "active" }));

    const service = await prisma.service.findUnique({ where: { stripeSubscriptionId: `sub_${RUN_ID}` } });
    expect(service).not.toBeNull();
    expect(service!.amount).toBe(200);
    expect(service!.endedAt).toBeNull();

    const events = await prisma.serviceMrrEvent.findMany({ where: { serviceId: service!.id } });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("NEW");
    expect(events[0].amountDelta).toBe(200);
  });

  it("an amount increase records an EXPANSION event", async () => {
    await syncStripeSubscription(
      fakeSubscription({
        status: "active",
        items: {
          data: [{ price: { unit_amount: 30000, recurring: { interval: "month" } } }],
        } as Stripe.Subscription["items"],
      })
    );

    const service = await prisma.service.findUnique({ where: { stripeSubscriptionId: `sub_${RUN_ID}` } });
    expect(service!.amount).toBe(300);

    const events = await prisma.serviceMrrEvent.findMany({
      where: { serviceId: service!.id },
      orderBy: { occurredAt: "asc" },
    });
    expect(events).toHaveLength(2);
    expect(events[1].type).toBe("EXPANSION");
    expect(events[1].amountDelta).toBe(100); // 300 - 200
  });

  it("an amount decrease records a CONTRACTION event", async () => {
    await syncStripeSubscription(
      fakeSubscription({
        status: "active",
        items: {
          data: [{ price: { unit_amount: 10000, recurring: { interval: "month" } } }],
        } as Stripe.Subscription["items"],
      })
    );

    const service = await prisma.service.findUnique({ where: { stripeSubscriptionId: `sub_${RUN_ID}` } });
    expect(service!.amount).toBe(100);

    const events = await prisma.serviceMrrEvent.findMany({
      where: { serviceId: service!.id },
      orderBy: { occurredAt: "asc" },
    });
    expect(events).toHaveLength(3);
    expect(events[2].type).toBe("CONTRACTION");
    expect(events[2].amountDelta).toBe(-200); // 100 - 300 (previous amount was 300 after the expansion test)
  });

  it("cancellation records a CHURN event and soft-ends the service", async () => {
    await syncStripeSubscription(
      fakeSubscription({
        status: "canceled",
        canceled_at: Math.floor(Date.now() / 1000),
        items: {
          data: [{ price: { unit_amount: 10000, recurring: { interval: "month" } } }],
        } as Stripe.Subscription["items"],
      })
    );

    const service = await prisma.service.findUnique({ where: { stripeSubscriptionId: `sub_${RUN_ID}` } });
    expect(service!.endedAt).not.toBeNull();

    const events = await prisma.serviceMrrEvent.findMany({
      where: { serviceId: service!.id },
      orderBy: { occurredAt: "asc" },
    });
    expect(events).toHaveLength(4);
    expect(events[3].type).toBe("CHURN");
    expect(events[3].amountDelta).toBe(-100); // the last active amount, negated
  });

  it("reactivating a canceled subscription records a new NEW event, not EXPANSION", async () => {
    await syncStripeSubscription(fakeSubscription({ status: "active" }));

    const service = await prisma.service.findUnique({ where: { stripeSubscriptionId: `sub_${RUN_ID}` } });
    expect(service!.endedAt).toBeNull();

    const events = await prisma.serviceMrrEvent.findMany({
      where: { serviceId: service!.id },
      orderBy: { occurredAt: "asc" },
    });
    expect(events).toHaveLength(5);
    expect(events[4].type).toBe("NEW");
    expect(events[4].amountDelta).toBe(200);
  });

  it("a non-monthly subscription never generates MRR events", async () => {
    const oneTimeSubId = `sub_onetime_${RUN_ID}`;
    await syncStripeSubscription(
      fakeSubscription({
        id: oneTimeSubId,
        status: "active",
        items: {
          data: [{ price: { unit_amount: 50000, recurring: { interval: "year" } } }],
        } as Stripe.Subscription["items"],
      })
    );
    const service = await prisma.service.findUnique({ where: { stripeSubscriptionId: oneTimeSubId } });
    expect(service!.billingType).toBe("ONE_TIME");
    const events = await prisma.serviceMrrEvent.findMany({ where: { serviceId: service!.id } });
    expect(events).toHaveLength(0);
  });
});
