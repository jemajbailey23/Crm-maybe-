import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

// sendPushToUser is the one place actual outbound push delivery happens —
// everything else (Prisma queries, the pruning logic) is real, only the
// network call to the push service (via the web-push library) is mocked,
// matching this suite's established "only genuinely external side effects
// are mocked" convention (see tests/mail.test.ts).
class MockWebPushError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

const sendNotification = vi.fn<
  (subscription: { endpoint: string }, payload?: string) => Promise<{ statusCode: number }>
>(async () => ({ statusCode: 201 }));
const setVapidDetails = vi.fn<(subject: string, publicKey: string, privateKey: string) => void>(() => {});

vi.mock("web-push", () => ({
  default: {
    sendNotification: (...args: Parameters<typeof sendNotification>) => sendNotification(...args),
    setVapidDetails: (...args: Parameters<typeof setVapidDetails>) => setVapidDetails(...args),
    WebPushError: MockWebPushError,
  },
}));

process.env.VAPID_PUBLIC_KEY = "test-public-key";
process.env.VAPID_PRIVATE_KEY = "test-private-key";
process.env.VAPID_SUBJECT = "mailto:test@example.com";

const { sendPushToUser } = await import("@/lib/push");

const RUN_ID = `test${Date.now()}${Math.floor(Math.random() * 10000)}`;
let subCount = 0;

async function makeSubscription(userId: string) {
  subCount += 1;
  return prisma.pushSubscription.create({
    data: {
      endpoint: `https://push.example.com/${RUN_ID}-${subCount}`,
      p256dh: "test-p256dh",
      auth: "test-auth",
      userId,
    },
  });
}

beforeEach(() => {
  sendNotification.mockClear();
  sendNotification.mockImplementation(async () => ({ statusCode: 201 }));
  setVapidDetails.mockClear();
});

afterAll(async () => {
  const owner = await prisma.user.findFirst();
  if (owner) await prisma.pushSubscription.deleteMany({ where: { userId: owner.id } });
});

describe("sendPushToUser", () => {
  it("sends to every registered device for the user", async () => {
    const owner = await prisma.user.findFirstOrThrow();
    await prisma.pushSubscription.deleteMany({ where: { userId: owner.id } });
    const subA = await makeSubscription(owner.id);
    const subB = await makeSubscription(owner.id);

    const results = await sendPushToUser(owner.id, { title: "Hi", body: "Test" });

    expect(results).toHaveLength(2);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(results.map((r) => r.subscriptionId).sort()).toEqual([subA.id, subB.id].sort());
    expect(sendNotification).toHaveBeenCalledTimes(2);
  });

  it("prunes a subscription the push service reports as gone (410)", async () => {
    const owner = await prisma.user.findFirstOrThrow();
    await prisma.pushSubscription.deleteMany({ where: { userId: owner.id } });
    const sub = await makeSubscription(owner.id);

    sendNotification.mockRejectedValueOnce(new MockWebPushError("Gone", 410));

    // The one registered device failing is a 100% failure rate, which
    // throws overall (see the "does not silently succeed" test below) —
    // pruning still happens even though the call itself surfaces as a
    // failure.
    await expect(sendPushToUser(owner.id, { title: "Hi", body: "Test" })).rejects.toThrow();

    const stillThere = await prisma.pushSubscription.findUnique({ where: { id: sub.id } });
    expect(stillThere).toBeNull();
  });

  it("does not prune a subscription on a transient (non-404/410) failure", async () => {
    const owner = await prisma.user.findFirstOrThrow();
    await prisma.pushSubscription.deleteMany({ where: { userId: owner.id } });
    const sub = await makeSubscription(owner.id);

    sendNotification.mockRejectedValueOnce(new MockWebPushError("Server error", 500));

    // Every device failed, so the overall call throws (fail loudly, not a
    // silent no-op) — but the subscription itself is still good.
    await expect(sendPushToUser(owner.id, { title: "Hi", body: "Test" })).rejects.toThrow();

    const stillThere = await prisma.pushSubscription.findUnique({ where: { id: sub.id } });
    expect(stillThere).not.toBeNull();
  });

  it("throws when the user has no registered devices", async () => {
    const owner = await prisma.user.findFirstOrThrow();
    await prisma.pushSubscription.deleteMany({ where: { userId: owner.id } });

    await expect(sendPushToUser(owner.id, { title: "Hi", body: "Test" })).rejects.toThrow(/No devices registered/);
  });

  it("reports a per-device failure without failing devices that succeeded", async () => {
    const owner = await prisma.user.findFirstOrThrow();
    await prisma.pushSubscription.deleteMany({ where: { userId: owner.id } });
    const good = await makeSubscription(owner.id);
    const bad = await makeSubscription(owner.id);

    sendNotification.mockImplementation(async (sub) => {
      if (sub.endpoint === bad.endpoint) throw new MockWebPushError("Gone", 404);
      return { statusCode: 201 };
    });

    const results = await sendPushToUser(owner.id, { title: "Hi", body: "Test" });
    expect(results.find((r) => r.subscriptionId === good.id)?.ok).toBe(true);
    expect(results.find((r) => r.subscriptionId === bad.id)?.ok).toBe(false);

    const badStillThere = await prisma.pushSubscription.findUnique({ where: { id: bad.id } });
    expect(badStillThere).toBeNull();
    const goodStillThere = await prisma.pushSubscription.findUnique({ where: { id: good.id } });
    expect(goodStillThere).not.toBeNull();
  });
});
