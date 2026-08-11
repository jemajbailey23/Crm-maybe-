import { describe, it, expect, vi, beforeEach } from "vitest";

// Bugfixes covered here:
//  - HTML-escaping of visitor-supplied text embedded in booking emails
//    (name/notes/body), which previously went in unescaped.
//  - sendBookingReminderEmail no longer builds a broken "/book/manage/"
//    link when manageUrl is omitted.
//
// mail.ts silently no-ops (just console.logs) unless GMAIL_USER/
// GMAIL_APP_PASSWORD are set, so both are faked here, and nodemailer's
// sendMail is mocked to capture the actual "html"/"text" payload sent —
// that's the only way to assert on the real rendered output.
type SentMail = { html?: string; text?: string; [key: string]: unknown };
const sendMail = vi.fn<(opts: SentMail) => Promise<Record<string, never>>>(async () => ({}));
vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail }) },
}));

process.env.GMAIL_USER = "test@example.com";
process.env.GMAIL_APP_PASSWORD = "fake-app-password";

const { sendBookingOwnerNotification, sendBookingConfirmationEmail, sendBookingReminderEmail, sendBookingCancellationEmail } =
  await import("@/lib/mail");

beforeEach(() => {
  sendMail.mockClear();
});

describe("HTML escaping in booking emails", () => {
  it("escapes a malicious visitor name in the owner notification", async () => {
    await sendBookingOwnerNotification("owner@example.com", {
      name: '<img src=x onerror="alert(1)">',
      email: "visitor@example.com",
      startsAt: new Date("2026-09-01T15:00:00Z"),
      notes: "<script>steal()</script>",
      timezone: "UTC",
    });

    const [call] = sendMail.mock.calls;
    const html = call[0].html as string;
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;img src=x");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes the body and cancellation policy in the confirmation email", async () => {
    await sendBookingConfirmationEmail("visitor@example.com", {
      subject: "Confirmed",
      body: 'Hi <b onclick="evil()">there</b>',
      manageUrl: "https://example.com/book/manage/abc123",
      cancellationPolicy: '24h notice <a href="evil">required</a>',
    });

    const [call] = sendMail.mock.calls;
    const html = call[0].html as string;
    // Escaping doesn't remove the text "onclick=" — it neutralizes the
    // markup around it so it can never parse as a real attribute. Assert
    // the actual dangerous, parseable HTML is gone and the escaped
    // (inert) form is present instead.
    expect(html).not.toContain('<b onclick="evil()">');
    expect(html).not.toContain('<a href="evil">');
    expect(html).toContain("&lt;b onclick=&quot;evil()&quot;&gt;");
  });

  it("escapes name and meeting type in the reminder email", async () => {
    await sendBookingReminderEmail("visitor@example.com", {
      name: '"><svg onload=alert(1)>',
      meetingTypeName: "Discovery Call",
      startsAt: new Date("2026-09-01T15:00:00Z"),
      timezone: "UTC",
      manageUrl: "https://example.com/book/manage/abc123",
      hoursBefore: 24,
    });

    const [call] = sendMail.mock.calls;
    const html = call[0].html as string;
    expect(html).not.toContain("<svg onload=");
    expect(html).toContain("&quot;&gt;&lt;svg");
  });

  it("escapes name and meeting type in the cancellation email", async () => {
    await sendBookingCancellationEmail("visitor@example.com", {
      name: "<b>Evil</b>",
      meetingTypeName: "<i>Fake</i> Call",
      startsAt: new Date("2026-09-01T15:00:00Z"),
      timezone: "UTC",
    });

    const [call] = sendMail.mock.calls;
    const html = call[0].html as string;
    expect(html).not.toContain("<b>Evil</b>");
    expect(html).not.toContain("<i>Fake</i>");
  });
});

describe("sendBookingReminderEmail — manage link", () => {
  it("includes a manage link when manageUrl is provided", async () => {
    await sendBookingReminderEmail("visitor@example.com", {
      name: "Ada",
      meetingTypeName: "Discovery Call",
      startsAt: new Date("2026-09-01T15:00:00Z"),
      timezone: "UTC",
      manageUrl: "https://example.com/book/manage/real-token",
      hoursBefore: 1,
    });
    const [call] = sendMail.mock.calls;
    expect(call[0].html).toContain("https://example.com/book/manage/real-token");
    expect(call[0].text).toContain("https://example.com/book/manage/real-token");
  });

  it("never renders a broken /book/manage/ link when manageUrl is omitted", async () => {
    await sendBookingReminderEmail("visitor@example.com", {
      name: "Ada",
      meetingTypeName: "Discovery Call",
      startsAt: new Date("2026-09-01T15:00:00Z"),
      timezone: "UTC",
      hoursBefore: 1,
    });
    const [call] = sendMail.mock.calls;
    expect(call[0].html).not.toContain("/book/manage/");
    expect(call[0].text).not.toContain("Manage your booking:");
  });
});
