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

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const transport = getTransport();
  const subject = "Reset your Bailey Ventures Digital CRM password";
  const text = `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email.`;
  const html = `<p>Click the link below to reset your CRM password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>`;

  if (!transport) {
    // No email provider configured (e.g. local dev) — log the link instead of sending.
    console.log(`[mail] GMAIL_USER/GMAIL_APP_PASSWORD not set — password reset link for ${to}:\n${resetUrl}`);
    return;
  }

  await transport.sendMail({
    from: `Bailey Ventures Digital CRM <${process.env.GMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });
}
