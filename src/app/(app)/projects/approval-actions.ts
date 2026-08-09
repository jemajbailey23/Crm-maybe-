"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ApprovalStatus } from "@prisma/client";

export type ApprovalFormState = { error?: string };

const STATUSES = Object.values(ApprovalStatus);

export async function addApproval(
  projectId: string,
  _prevState: ApprovalFormState,
  formData: FormData
): Promise<ApprovalFormState> {
  await requireUser();
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return { error: "Approval label can't be empty." };

  await prisma.projectApproval.create({ data: { projectId, label } });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
  return {};
}

export async function setApprovalStatus(approvalId: string, status: string) {
  await requireUser();
  if (!STATUSES.includes(status as ApprovalStatus)) return;

  const approval = await prisma.projectApproval.update({
    where: { id: approvalId },
    data: {
      status: status as ApprovalStatus,
      respondedAt: status === "PENDING" ? null : new Date(),
    },
  });
  revalidatePath(`/projects/${approval.projectId}`);
  revalidatePath("/dashboard");
}

export async function deleteApproval(approvalId: string) {
  await requireUser();
  const approval = await prisma.projectApproval.delete({ where: { id: approvalId } });
  revalidatePath(`/projects/${approval.projectId}`);
  revalidatePath("/dashboard");
}
