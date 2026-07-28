"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ContactStatus, DealStage, Priority, ContractStatus } from "@prisma/client";
import { fireAutomationTrigger } from "@/lib/automations";

export type ContactFormState = { error?: string };

const STATUSES = Object.values(ContactStatus);
const STAGES = Object.values(DealStage);
const PRIORITIES = Object.values(Priority);
const CONTRACT_STATUSES = Object.values(ContractStatus);

function str(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function clampInt(formData: FormData, key: string, min: number, max: number) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const num = Math.round(Number(raw));
  if (Number.isNaN(num)) return null;
  return Math.min(max, Math.max(min, num));
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

function parseContactFields(formData: FormData) {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "").trim();
  const stageRaw = String(formData.get("pipelineStage") ?? "").trim();
  const priorityRaw = String(formData.get("priority") ?? "").trim();

  return {
    firstName,
    lastName,
    status: STATUSES.includes(statusRaw as ContactStatus)
      ? (statusRaw as ContactStatus)
      : ContactStatus.LEAD,

    // Business information
    businessName: str(formData, "businessName"),
    industry: str(formData, "industry"),
    website: str(formData, "website"),
    googleBusinessProfile: str(formData, "googleBusinessProfile"),
    facebook: str(formData, "facebook"),
    instagram: str(formData, "instagram"),
    phone: str(formData, "phone"),
    email: str(formData, "email"),
    address: str(formData, "address"),

    // Sales information
    leadSource: str(formData, "leadSource"),
    pipelineStage: STAGES.includes(stageRaw as DealStage)
      ? (stageRaw as DealStage)
      : DealStage.NEW,
    estimatedDealValue: money(formData, "estimatedDealValue"),
    monthlyValue: money(formData, "monthlyValue"),
    leadScore: clampInt(formData, "leadScore", 1, 100),
    closingProbability: clampInt(formData, "closingProbability", 0, 100),
    priority: PRIORITIES.includes(priorityRaw as Priority)
      ? (priorityRaw as Priority)
      : Priority.MEDIUM,
    nextFollowUpAt: date(formData, "nextFollowUpAt"),

    // Pain points
    currentProblems: str(formData, "currentProblems"),
    desiredOutcome: str(formData, "desiredOutcome"),
    competitors: str(formData, "competitors"),
    notes: str(formData, "notes"),

    title: str(formData, "title"),
    tags: str(formData, "tags"),
    companyId: str(formData, "companyId"),
  };
}

export async function createContact(
  _prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const fields = parseContactFields(formData);
  if (!fields.firstName || !fields.lastName) {
    return { error: "First and last name are required." };
  }

  const contact = await prisma.contact.create({ data: fields });
  revalidatePath("/contacts");
  revalidatePath("/dashboard");

  if (contact.status === "LEAD") {
    await fireAutomationTrigger("LEAD_CREATED", {
      contactId: contact.id,
      summary: contact.businessName || `${contact.firstName} ${contact.lastName}`,
    });
  }

  redirect(`/contacts/${contact.id}`);
}

export async function updateContact(
  contactId: string,
  _prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const fields = parseContactFields(formData);
  if (!fields.firstName || !fields.lastName) {
    return { error: "First and last name are required." };
  }

  await prisma.contact.update({ where: { id: contactId }, data: fields });
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/dashboard");
  return {};
}

export async function updateContractStatus(contactId: string, status: string) {
  if (!CONTRACT_STATUSES.includes(status as ContractStatus)) return;

  const contact = await prisma.contact.update({
    where: { id: contactId },
    data: { contractStatus: status as ContractStatus },
  });
  revalidatePath(`/contacts/${contactId}`);

  if (status === "SIGNED") {
    await fireAutomationTrigger("CLIENT_SIGNED", {
      contactId: contact.id,
      summary: contact.businessName || `${contact.firstName} ${contact.lastName}`,
    });
  }
}

export async function deleteContact(contactId: string) {
  await prisma.contact.delete({ where: { id: contactId } });
  revalidatePath("/contacts");
  revalidatePath("/dashboard");
  redirect("/contacts");
}
