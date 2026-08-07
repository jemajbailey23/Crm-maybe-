"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type BulkActionResult = { error?: string };

export async function bulkDeleteCompanies(ids: string[]): Promise<BulkActionResult> {
  if (ids.length === 0) return { error: "No companies selected." };
  await prisma.company.deleteMany({ where: { id: { in: ids } } });
  revalidatePath("/companies");
  revalidatePath("/dashboard");
  return {};
}
