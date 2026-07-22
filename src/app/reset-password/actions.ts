"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { consumePasswordResetToken, createSession, hashPassword } from "@/lib/auth";

export type ResetPasswordState = { error?: string };

export async function resetPassword(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token) {
    return { error: "Missing or invalid reset link." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords don't match." };
  }

  const userId = await consumePasswordResetToken(token);
  if (!userId) {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  await createSession(userId);
  redirect("/dashboard");
}
