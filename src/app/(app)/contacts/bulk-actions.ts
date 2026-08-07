"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ContactStatus } from "@prisma/client";

export type BulkActionResult = { error?: string };

export async function bulkDeleteContacts(ids: string[]): Promise<BulkActionResult> {
  if (ids.length === 0) return { error: "No contacts selected." };
  await prisma.contact.deleteMany({ where: { id: { in: ids } } });
  revalidatePath("/contacts");
  revalidatePath("/dashboard");
  return {};
}

export async function bulkUpdateContactStatus(ids: string[], status: string): Promise<BulkActionResult> {
  if (ids.length === 0) return { error: "No contacts selected." };
  if (status !== "LEAD" && status !== "CLIENT") return { error: "Invalid status." };
  await prisma.contact.updateMany({
    where: { id: { in: ids } },
    data: { status: status as ContactStatus },
  });
  revalidatePath("/contacts");
  revalidatePath("/dashboard");
  return {};
}
