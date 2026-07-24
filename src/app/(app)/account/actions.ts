"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, verifyPassword } from "@/lib/auth";

export type ChangeEmailState = { error?: string; success?: boolean };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function changeEmail(
  _prevState: ChangeEmailState,
  formData: FormData
): Promise<ChangeEmailState> {
  const user = await requireUser();

  const newEmail = String(formData.get("newEmail") ?? "")
    .trim()
    .toLowerCase();
  const confirmEmail = String(formData.get("confirmEmail") ?? "")
    .trim()
    .toLowerCase();
  const currentPassword = String(formData.get("currentPassword") ?? "");

  if (!newEmail || !confirmEmail || !currentPassword) {
    return { error: "Fill in all fields." };
  }
  if (!EMAIL_PATTERN.test(newEmail)) {
    return { error: "Enter a valid email address." };
  }
  if (newEmail !== confirmEmail) {
    return { error: "Emails don't match." };
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    return { error: "Incorrect password." };
  }

  if (newEmail === user.email) {
    return { error: "That's already your email." };
  }

  const existing = await prisma.user.findUnique({ where: { email: newEmail } });
  if (existing) {
    return { error: "That email is already in use." };
  }

  await prisma.user.update({ where: { id: user.id }, data: { email: newEmail } });

  revalidatePath("/account");
  return { success: true };
}

export type ChangeNameState = { error?: string; success?: boolean };

export async function changeName(
  _prevState: ChangeNameState,
  formData: FormData
): Promise<ChangeNameState> {
  const user = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Name can't be empty." };
  }

  await prisma.user.update({ where: { id: user.id }, data: { name } });

  revalidatePath("/account");
  revalidatePath("/", "layout");
  return { success: true };
}
