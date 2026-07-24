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

async function send(options: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const transport = getTransport();

  if (!transport) {
    // No email provider configured (e.g. local dev) — log instead of sending.
    console.log(`[mail] GMAIL_USER/GMAIL_APP_PASSWORD not set — email to ${options.to}:\n${options.subject}\n${options.text}`);
    return;
  }

  await transport.sendMail({
    from: `Bailey Ventures Digital CRM <${process.env.GMAIL_USER}>`,
    ...options,
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
  booking: { name: string; email: string; startsAt: Date; notes: string | null }
) {
  const when = booking.startsAt.toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  });
  await send({
    to: ownerEmail,
    subject: `New call booked: ${booking.name}`,
    text: `${booking.name} (${booking.email}) booked a call for ${when}.${booking.notes ? `\n\nNotes: ${booking.notes}` : ""}`,
    html: `<p><strong>${booking.name}</strong> (${booking.email}) booked a call for <strong>${when}</strong>.</p>${booking.notes ? `<p>Notes: ${booking.notes}</p>` : ""}`,
  });
}

export async function sendBookingConfirmation(
  to: string,
  booking: { name: string; startsAt: Date }
) {
  const when = booking.startsAt.toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  });
  await send({
    to,
    subject: "Your call is confirmed",
    text: `Hi ${booking.name}, your call is confirmed for ${when}. See you then!`,
    html: `<p>Hi ${booking.name},</p><p>Your call is confirmed for <strong>${when}</strong>. See you then!</p>`,
  });
}
