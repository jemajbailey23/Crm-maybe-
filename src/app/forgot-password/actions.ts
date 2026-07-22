"use server";

import { prisma } from "@/lib/prisma";
import { createPasswordResetToken } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/mail";

export type ForgotPasswordState = { submitted?: boolean };

export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = await createPasswordResetToken(user.id);
      const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;
      await sendPasswordResetEmail(user.email, resetUrl);
    }
  }

  // Always report success, whether or not the email is registered,
  // so this can't be used to enumerate accounts.
  return { submitted: true };
}
