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
  await send({
    to: ownerEmail,
    subject: `${label}: ${booking.name}${what}`,
    text: `${booking.name} (${booking.email}) ${verb} ${when}.${booking.notes ? `\n\nNotes: ${booking.notes}` : ""}`,
    html: `<p><strong>${booking.name}</strong> (${booking.email}) ${verb} <strong>${when}</strong>.</p>${booking.notes ? `<p>Notes: ${booking.notes}</p>` : ""}`,
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
  await send({
    to,
    subject: params.subject,
    text: `${params.body}${policyLine}${manageLine}`,
    html: `<p>${params.body.replace(/\n/g, "<br>")}</p>${
      params.cancellationPolicy ? `<p>${params.cancellationPolicy}</p>` : ""
    }<p><a href="${params.manageUrl}">Manage your booking</a></p>`,
  });
}

export async function sendBookingReminderEmail(
  to: string,
  params: { name: string; meetingTypeName: string; startsAt: Date; timezone: string; manageUrl: string; hoursBefore: number }
) {
  const when = formatBookingWhen(params.startsAt, params.timezone);
  const lead = params.hoursBefore >= 24 ? `in ${Math.round(params.hoursBefore / 24)} day(s)` : `in ${params.hoursBefore} hour(s)`;
  await send({
    to,
    subject: `Reminder: ${params.meetingTypeName} ${lead}`,
    text: `Hi ${params.name}, this is a reminder that your ${params.meetingTypeName} is scheduled for ${when}.\n\nManage your booking: ${params.manageUrl}`,
    html: `<p>Hi ${params.name}, this is a reminder that your <strong>${params.meetingTypeName}</strong> is scheduled for <strong>${when}</strong>.</p><p><a href="${params.manageUrl}">Manage your booking</a></p>`,
  });
}

export async function sendBookingCancellationEmail(
  to: string,
  params: { name: string; meetingTypeName: string; startsAt: Date; timezone: string }
) {
  const when = formatBookingWhen(params.startsAt, params.timezone);
  await send({
    to,
    subject: `Cancelled: ${params.meetingTypeName}`,
    text: `Hi ${params.name}, your ${params.meetingTypeName} scheduled for ${when} has been cancelled.`,
    html: `<p>Hi ${params.name}, your <strong>${params.meetingTypeName}</strong> scheduled for <strong>${when}</strong> has been cancelled.</p>`,
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

