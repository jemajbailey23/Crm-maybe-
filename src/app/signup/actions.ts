"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword } from "@/lib/auth";

export type SignupState = { error?: string };

export async function signup(
  _prevState: SignupState,
  formData: FormData
): Promise<SignupState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password) {
    return { error: "Name, email, and password are all required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  // Signup only bootstraps the very first account. Once a user exists,
  // new team members should be added by an admin (a future feature).
  const existingUserCount = await prisma.user.count();
  if (existingUserCount > 0) {
    redirect("/login");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password) },
  });

  await createSession(user.id);
  redirect("/dashboard");
}
