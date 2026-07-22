"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";

export type LoginState = { error?: string };

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function minutesRemaining(lockedUntil: Date) {
  return Math.max(1, Math.ceil((lockedUntil.getTime() - Date.now()) / 60000));
}

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    return {
      error: `Too many failed attempts. Try again in ${minutesRemaining(user.lockedUntil)} minute(s).`,
    };
  }

  const valid = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !valid) {
    if (user) {
      const failedLoginAttempts = user.failedLoginAttempts + 1;
      const lockedOut = failedLoginAttempts >= MAX_FAILED_ATTEMPTS;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: lockedOut ? 0 : failedLoginAttempts,
          lockedUntil: lockedOut ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
        },
      });
      if (lockedOut) {
        return {
          error: `Too many failed attempts. Try again in ${LOCKOUT_DURATION_MS / 60000} minute(s).`,
        };
      }
    }
    return { error: "Invalid email or password." };
  }

  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  await createSession(user.id);
  redirect("/dashboard");
}
