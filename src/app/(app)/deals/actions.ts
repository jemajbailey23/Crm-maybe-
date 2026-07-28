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
  const isRecurring = formData.get("isRecurring") === "on";

  const value = valueRaw ? Number(valueRaw) : null;
  const stage = STAGES.includes(stageRaw as DealStage)
    ? (stageRaw as DealStage)
    : DealStage.NEW;

  return {
    title,
    value: value !== null && !Number.isNaN(value) ? value : null,
    stage,
    isRecurring,
    notes: notes || null,
    contactId: contactId || null,
    companyId: companyId || null,
  };
}

// wonAt tracks the moment a deal first became WON, kept stable across
// unrelated edits so "revenue this month" reporting stays accurate.
function nextWonAt(previousStage: DealStage, nextStage: DealStage, previousWonAt: Date | null) {
  if (nextStage === "WON") return previousStage === "WON" ? previousWonAt : new Date();
  return null;
}

export async function createDeal(
  _prevState: DealFormState,
  formData: FormData
): Promise<DealFormState> {
  const fields = parseDealFields(formData);
  if (!fields.title) {
    return { error: "Deal title is required." };
  }

  const deal = await prisma.deal.create({
    data: { ...fields, wonAt: fields.stage === "WON" ? new Date() : null },
  });
  revalidatePath("/deals");
  revalidatePath("/dashboard");
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

  const existing = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!existing) return { error: "Deal not found." };

  const deal = await prisma.deal.update({
    where: { id: dealId },
    data: {
      ...fields,
      wonAt: nextWonAt(existing.stage, fields.stage, existing.wonAt),
    },
  });
  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/dashboard");
  if (deal.contactId) revalidatePath(`/contacts/${deal.contactId}`);
  if (deal.companyId) revalidatePath(`/companies/${deal.companyId}`);
  return {};
}

export async function updateDealStage(dealId: string, stage: string) {
  if (!STAGES.includes(stage as DealStage)) return;

  const existing = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!existing) return;

  await prisma.deal.update({
    where: { id: dealId },
    data: {
      stage: stage as DealStage,
      wonAt: nextWonAt(existing.stage, stage as DealStage, existing.wonAt),
    },
  });
  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/dashboard");
}

export async function deleteDeal(dealId: string) {
  await prisma.deal.delete({ where: { id: dealId } });
  revalidatePath("/deals");
  revalidatePath("/dashboard");
  redirect("/deals");
}
