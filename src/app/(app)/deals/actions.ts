"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DealStage, BillingType } from "@prisma/client";
import { validateStageTransition, type DealGateInput } from "./deal-rules";

export type DealFormState = { error?: string };

const STAGES = Object.values(DealStage);
const BILLING_METHODS = Object.values(BillingType);

function str(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function money(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const num = Number(raw);
  return Number.isNaN(num) ? null : num;
}

function date(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function clampInt(formData: FormData, key: string, min: number, max: number) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const num = Math.round(Number(raw));
  if (Number.isNaN(num)) return null;
  return Math.min(max, Math.max(min, num));
}

function parseDealFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const stageRaw = String(formData.get("stage") ?? "").trim();
  const billingMethodRaw = String(formData.get("billingMethod") ?? "").trim();

  const stage = STAGES.includes(stageRaw as DealStage) ? (stageRaw as DealStage) : DealStage.NEW_LEAD;

  return {
    title,
    stage,
    contactId: str(formData, "contactId"),
    companyId: str(formData, "companyId"),
    assignedToId: str(formData, "assignedToId"),
    serviceInterest: str(formData, "serviceInterest"),
    leadSource: str(formData, "leadSource"),
    probability: clampInt(formData, "probability", 0, 100),
    expectedCloseDate: date(formData, "expectedCloseDate"),
    oneTimeValue: money(formData, "oneTimeValue"),
    mrrValue: money(formData, "mrrValue"),
    nextAction: str(formData, "nextAction"),
    nextActionDueAt: date(formData, "nextActionDueAt"),
    decisionMaker: str(formData, "decisionMaker"),
    meetingDate: date(formData, "meetingDate"),
    startDate: date(formData, "startDate"),
    billingMethod: BILLING_METHODS.includes(billingMethodRaw as BillingType)
      ? (billingMethodRaw as BillingType)
      : null,
    proposalAccepted: formData.get("proposalAccepted") === "on",
    lostReason: str(formData, "lostReason"),
    competitor: str(formData, "competitor"),
    notes: str(formData, "notes"),
  };
}

async function hasRelatedBooking(contactId: string | null): Promise<boolean> {
  if (!contactId) return false;
  const booking = await prisma.booking.findFirst({ where: { contactId }, select: { id: true } });
  return booking !== null;
}

function gateInputFrom(fields: ReturnType<typeof parseDealFields>): DealGateInput {
  return {
    contactId: fields.contactId,
    serviceInterest: fields.serviceInterest,
    oneTimeValue: fields.oneTimeValue,
    mrrValue: fields.mrrValue,
    decisionMaker: fields.decisionMaker,
    meetingDate: fields.meetingDate,
    startDate: fields.startDate,
    billingMethod: fields.billingMethod,
    proposalAccepted: fields.proposalAccepted,
    lostReason: fields.lostReason,
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

  const gateError = validateStageTransition(
    fields.stage,
    gateInputFrom(fields),
    await hasRelatedBooking(fields.contactId)
  );
  if (gateError) return { error: gateError };

  const deal = await prisma.deal.create({
    data: {
      ...fields,
      stageEnteredAt: new Date(),
      wonAt: fields.stage === "WON" ? new Date() : null,
    },
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

  const stageChanged = existing.stage !== fields.stage;
  if (stageChanged) {
    const gateError = validateStageTransition(
      fields.stage,
      gateInputFrom(fields),
      await hasRelatedBooking(fields.contactId)
    );
    if (gateError) return { error: gateError };
  }

  const deal = await prisma.deal.update({
    where: { id: dealId },
    data: {
      ...fields,
      stageEnteredAt: stageChanged ? new Date() : undefined,
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

export type StageChangeResult = { error?: string };

export async function updateDealStage(dealId: string, stage: string): Promise<StageChangeResult> {
  if (!STAGES.includes(stage as DealStage)) return { error: "Invalid stage." };

  const existing = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!existing) return { error: "Deal not found." };

  const nextStage = stage as DealStage;
  if (existing.stage !== nextStage) {
    const gateError = validateStageTransition(
      nextStage,
      {
        contactId: existing.contactId,
        serviceInterest: existing.serviceInterest,
        oneTimeValue: existing.oneTimeValue,
        mrrValue: existing.mrrValue,
        decisionMaker: existing.decisionMaker,
        meetingDate: existing.meetingDate,
        startDate: existing.startDate,
        billingMethod: existing.billingMethod,
        proposalAccepted: existing.proposalAccepted,
        lostReason: existing.lostReason,
      },
      await hasRelatedBooking(existing.contactId)
    );
    if (gateError) return { error: gateError };
  }

  await prisma.deal.update({
    where: { id: dealId },
    data: {
      stage: nextStage,
      stageEnteredAt: existing.stage !== nextStage ? new Date() : undefined,
      wonAt: nextWonAt(existing.stage, nextStage, existing.wonAt),
    },
  });
  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/dashboard");
  return {};
}

export async function deleteDeal(dealId: string) {
  await prisma.deal.delete({ where: { id: dealId } });
  revalidatePath("/deals");
  revalidatePath("/dashboard");
  redirect("/deals");
}
