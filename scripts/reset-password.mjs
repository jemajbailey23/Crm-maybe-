// Resets a user's password directly in the database. Run this if you're
// locked out — there's no self-service "forgot password" flow yet.
//
// Usage: npm run reset-password -- someone@example.com newpassword123
// Requires DATABASE_URL to point at the target database (local or production).

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const [, , email, newPassword] = process.argv;

if (!email || !newPassword) {
  console.error("Usage: npm run reset-password -- <email> <new-password>");
  process.exit(1);
}

if (newPassword.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const prisma = new PrismaClient();

const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
if (!user) {
  console.error(`No user found with email ${email}`);
  await prisma.$disconnect();
  process.exit(1);
}

const passwordHash = await bcrypt.hash(newPassword, 10);
await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

console.log(`Password updated for ${user.email}.`);
await prisma.$disconnect();
