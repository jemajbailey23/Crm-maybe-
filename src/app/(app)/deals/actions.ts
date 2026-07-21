"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DealStage } from "@prisma/client";

export type DealFormState = { error?: string };

const STAGES = Object.values(DealStage);

function parseDealFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const valueRaw = String(formData.get("value") ?? "").trim();
  const stageRaw = String(formData.get("stage") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const contactId = String(formData.get("contactId") ?? "").trim();
  const companyId = String(formData.get("companyId") ?? "").trim();

  const value = valueRaw ? Number(valueRaw) : null;
  const stage = STAGES.includes(stageRaw as DealStage)
    ? (stageRaw as DealStage)
    : DealStage.NEW;

  return {
    title,
    value: value !== null && !Number.isNaN(value) ? value : null,
    stage,
    notes: notes || null,
    contactId: contactId || null,
    companyId: companyId || null,
  };
}

export async function createDeal(
  _prevState: DealFormState,
  formData: FormData
): Promise<DealFormState> {
  const fields = parseDealFields(formData);
  if (!fields.title) {
    return { error: "Deal title is required." };
  }

  const deal = await prisma.deal.create({ data: fields });
  revalidatePath("/deals");
  if (fields.contactId) revalidatePath(`/contacts/${fields.contactId}`);
  if (fields.companyId) revalidatePath(`/companies/${fields.companyId}`);
  redirect(`/deals/${deal.id}`);
}

export async function updateDeal(
  dealId: string,
  _prevState: DealFormState,
  formData: FormData
): Promise<DealFormState> {
  const fields = parseDealFields(formData);
  if (!fields.title) {
    return { error: "Deal title is required." };
  }

  const deal = await prisma.deal.update({
    where: { id: dealId },
    data: fields,
  });
  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
  if (deal.contactId) revalidatePath(`/contacts/${deal.contactId}`);
  if (deal.companyId) revalidatePath(`/companies/${deal.companyId}`);
  return {};
}

export async function updateDealStage(dealId: string, stage: string) {
  if (!STAGES.includes(stage as DealStage)) return;

  await prisma.deal.update({
    where: { id: dealId },
    data: { stage: stage as DealStage },
  });
  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
}

export async function deleteDeal(dealId: string) {
  await prisma.deal.delete({ where: { id: dealId } });
  revalidatePath("/deals");
  redirect("/deals");
}
