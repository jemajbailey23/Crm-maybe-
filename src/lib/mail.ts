import "server-only";
import nodemailer from "nodemailer";

function getTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

export function isMailConfigured() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

// Bugfix: booking-related emails below embed visitor-supplied text (name,
// notes, a meeting type's owner-authored confirmation body) directly into
// the `html` field. Without escaping, a visitor who books with a name
// like `<a href="evil">Click here</a>` gets that rendered as live HTML in
// the email sent to both themselves and the CRM owner — a real phishing/
// spoofing surface, even though most mail clients strip <script>. Every
// dynamic value going into an HTML string in this file should be passed
// through this first; the plain-text `text` field is unaffected (email
// clients render it literally, so raw text there is safe).
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function send(options: {
  to: string;
  subject: string;
  text: string;
  html: string;
  fromName?: string;
}) {
  const transport = getTransport();

  if (!transport) {
    // No email provider configured (e.g. local dev) — log instead of sending.
    console.log(`[mail] GMAIL_USER/GMAIL_APP_PASSWORD not set — email to ${options.to}:\n${options.subject}\n${options.text}`);
    return;
  }

  const { fromName, ...mail } = options;
  await transport.sendMail({
    from: `${fromName || "Bailey Ventures Digital CRM"} <${process.env.GMAIL_USER}>`,
    ...mail,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await send({
    to,
    subject: "Reset your Bailey Ventures Digital CRM password",
    text: `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email.`,
    html: `<p>Click the link below to reset your CRM password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>`,
  });
}

export async function sendOnboardingFormEmail(
  to: string,
  info: { name: string; formUrl: string; ownerName?: string }
) {
  const safeName = escapeHtml(info.name);
  await send({
    to,
    subject: "A couple quick details to get you set up",
    text: `Hi ${info.name},\n\nCould you fill out a couple details so we can get your account set up? It only takes a minute: ${info.formUrl}\n\nThanks!`,
    html: `<p>Hi ${safeName},</p><p>Could you fill out a couple details so we can get your account set up? It only takes a minute.</p><p><a href="${info.formUrl}">${info.formUrl}</a></p><p>Thanks!</p>`,
    fromName: info.ownerName,
  });
}

export async function sendBookingOwnerNotification(
  ownerEmail: string,
  booking: {
    name: string;
    email: string;
    startsAt: Date;
    notes: string | null;
    timezone: string;
    meetingTypeName?: string;
    kind?: "booked" | "rescheduled" | "cancelled";
  }
) {
  const when = booking.startsAt.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: booking.timezone,
    timeZoneName: "short",
  });
  const what = booking.meetingTypeName ? ` (${booking.meetingTypeName})` : "";
  const verb = booking.kind === "rescheduled" ? "rescheduled to" : booking.kind === "cancelled" ? "cancelled" : "booked for";
  const label = booking.kind === "rescheduled" ? "Rescheduled" : booking.kind === "cancelled" ? "Cancelled" : "New booking";
  const safeName = escapeHtml(booking.name);
  const safeEmail = escapeHtml(booking.email);
  const safeNotes = booking.notes ? escapeHtml(booking.notes) : null;
  await send({
    to: ownerEmail,
    subject: `${label}: ${booking.name}${what}`,
    text: `${booking.name} (${booking.email}) ${verb} ${when}.${booking.notes ? `\n\nNotes: ${booking.notes}` : ""}`,
    html: `<p><strong>${safeName}</strong> (${safeEmail}) ${verb} <strong>${when}</strong>.</p>${safeNotes ? `<p>Notes: ${safeNotes}</p>` : ""}`,
  });
}

function formatBookingWhen(startsAt: Date, timezone: string) {
  return startsAt.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
    timeZoneName: "short",
  });
}

export async function sendBookingConfirmationEmail(
  to: string,
  params: {
    subject: string;
    body: string;
    manageUrl: string;
    cancellationPolicy: string | null;
  }
) {
  const policyLine = params.cancellationPolicy ? `\n\n${params.cancellationPolicy}` : "";
  const manageLine = `\n\nNeed to make a change? Manage your booking: ${params.manageUrl}`;
  const safeBody = escapeHtml(params.body).replace(/\n/g, "<br>");
  const safePolicy = params.cancellationPolicy ? escapeHtml(params.cancellationPolicy) : null;
  await send({
    to,
    subject: params.subject,
    text: `${params.body}${policyLine}${manageLine}`,
    html: `<p>${safeBody}</p>${
      safePolicy ? `<p>${safePolicy}</p>` : ""
    }<p><a href="${params.manageUrl}">Manage your booking</a></p>`,
  });
}

export async function sendBookingReminderEmail(
  to: string,
  // manageUrl is optional — bugfix: the caller used to pass an empty
  // string when a booking had no manage token, which produced a broken
  // ".../book/manage/" link instead of just omitting it. Absent/empty now
  // means "don't include a manage link" rather than "include a broken one."
  params: { name: string; meetingTypeName: string; startsAt: Date; timezone: string; manageUrl?: string; hoursBefore: number }
) {
  const when = formatBookingWhen(params.startsAt, params.timezone);
  const lead = params.hoursBefore >= 24 ? `in ${Math.round(params.hoursBefore / 24)} day(s)` : `in ${params.hoursBefore} hour(s)`;
  const safeName = escapeHtml(params.name);
  const safeType = escapeHtml(params.meetingTypeName);
  const manageTextLine = params.manageUrl ? `\n\nManage your booking: ${params.manageUrl}` : "";
  const manageHtmlLine = params.manageUrl ? `<p><a href="${params.manageUrl}">Manage your booking</a></p>` : "";
  await send({
    to,
    subject: `Reminder: ${params.meetingTypeName} ${lead}`,
    text: `Hi ${params.name}, this is a reminder that your ${params.meetingTypeName} is scheduled for ${when}.${manageTextLine}`,
    html: `<p>Hi ${safeName}, this is a reminder that your <strong>${safeType}</strong> is scheduled for <strong>${when}</strong>.</p>${manageHtmlLine}`,
  });
}

export async function sendBookingCancellationEmail(
  to: string,
  params: { name: string; meetingTypeName: string; startsAt: Date; timezone: string }
) {
  const when = formatBookingWhen(params.startsAt, params.timezone);
  const safeName = escapeHtml(params.name);
  const safeType = escapeHtml(params.meetingTypeName);
  await send({
    to,
    subject: `Cancelled: ${params.meetingTypeName}`,
    text: `Hi ${params.name}, your ${params.meetingTypeName} scheduled for ${when} has been cancelled.`,
    html: `<p>Hi ${safeName}, your <strong>${safeType}</strong> scheduled for <strong>${when}</strong> has been cancelled.</p>`,
  });
}

export async function sendAutomationEmail(
  to: string,
  subject: string,
  body: string,
  // Client-facing automation emails (SEND_EMAIL rules aimed at a contact)
  // pass the real owner's name here instead of the default "...CRM" sender
  // name — a display name that reads like software is one of several
  // signals spam filters weigh, and this one's easy to avoid.
  fromName?: string
) {
  await send({
    to,
    subject,
    text: body,
    html: body
      .split("\n\n")
      .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
      .join(""),
    fromName,
  });
}

