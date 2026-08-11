"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma, type DealStage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { uniqueMeetingTypeSlug } from "@/lib/slug";
import { parseWeeklyAvailability } from "../weekly-availability-fields";
import { STAGE_ORDER } from "@/lib/pipeline-stages";

export type MeetingTypeState = { error?: string };

// One question per line: "Label text" for optional, "Label text|required"
// to require an answer. Kept as a lightweight line-based format rather
// than a full add/remove-row builder UI, to keep this form usable without
// a large amount of client-side state machinery.
function parseIntakeQuestions(raw: string): { id: string; label: string; required: boolean }[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => {
      const required = /\|\s*required\s*$/i.test(line);
      const label = line.replace(/\|\s*required\s*$/i, "").trim();
      return { id: `q${i + 1}`, label, required };
    })
    .filter((q) => q.label.length > 0);
}

function parseReminderHours(raw: string): number[] {
  return raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function readFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const durationMinutes = Number(formData.get("durationMinutes"));
  const bufferBeforeMinutes = Number(formData.get("bufferBeforeMinutes") ?? 0);
  const bufferAfterMinutes = Number(formData.get("bufferAfterMinutes") ?? 0);
  const minNoticeHours = Number(formData.get("minNoticeHours") ?? 12);
  const maxAdvanceDays = Number(formData.get("maxAdvanceDays") ?? 30);
  const intakeQuestionsRaw = String(formData.get("intakeQuestions") ?? "");
  const confirmationSubject = String(formData.get("confirmationSubject") ?? "").trim();
  const confirmationBody = String(formData.get("confirmationBody") ?? "").trim();
  const reminderHoursRaw = String(formData.get("reminderHoursBefore") ?? "");
  const cancellationPolicy = String(formData.get("cancellationPolicy") ?? "").trim();
  const minCancelNoticeHoursRaw = String(formData.get("minCancelNoticeHours") ?? "").trim();
  const allowRescheduling = formData.get("allowRescheduling") === "on";
  const isActive = formData.get("isActive") === "on";
  const relatedDealStageRaw = String(formData.get("relatedDealStage") ?? "");
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  const useCustomAvailability = formData.get("useCustomAvailability") === "on";

  return {
    name,
    description,
    durationMinutes,
    bufferBeforeMinutes,
    bufferAfterMinutes,
    minNoticeHours,
    maxAdvanceDays,
    intakeQuestions: parseIntakeQuestions(intakeQuestionsRaw),
    confirmationSubject,
    confirmationBody,
    reminderHoursBefore: parseReminderHours(reminderHoursRaw),
    cancellationPolicy,
    minCancelNoticeHours: minCancelNoticeHoursRaw ? Number(minCancelNoticeHoursRaw) : null,
    allowRescheduling,
    isActive,
    relatedDealStage: STAGE_ORDER.includes(relatedDealStageRaw as DealStage) ? (relatedDealStageRaw as DealStage) : null,
    sortOrder,
    useCustomAvailability,
  };
}

function validate(fields: ReturnType<typeof readFields>): string | null {
  if (!fields.name) return "Name is required.";
  if (!Number.isInteger(fields.durationMinutes) || fields.durationMinutes < 5 || fields.durationMinutes > 480) {
    return "Duration must be between 5 and 480 minutes.";
  }
  if (fields.bufferBeforeMinutes < 0 || fields.bufferAfterMinutes < 0) {
    return "Buffers can't be negative.";
  }
  if (!Number.isInteger(fields.minNoticeHours) || fields.minNoticeHours < 0) {
    return "Minimum notice must be a non-negative whole number of hours.";
  }
  if (!Number.isInteger(fields.maxAdvanceDays) || fields.maxAdvanceDays < 1) {
    return "Maximum advance window must be at least 1 day.";
  }
  if (fields.minCancelNoticeHours !== null && (!Number.isFinite(fields.minCancelNoticeHours) || fields.minCancelNoticeHours < 0)) {
    return "Cancellation notice must be a non-negative number of hours.";
  }
  return null;
}

export async function createMeetingType(_prevState: MeetingTypeState, formData: FormData): Promise<MeetingTypeState> {
  await requireUser();
  const fields = readFields(formData);
  const error = validate(fields);
  if (error) return { error };

  const slug = await uniqueMeetingTypeSlug(fields.name);
  const availability = fields.useCustomAvailability ? parseWeeklyAvailability(formData, "avail-") : [];
  if ("error" in availability) return { error: availability.error };

  await prisma.meetingType.create({
    data: {
      name: fields.name,
      slug,
      description: fields.description || null,
      durationMinutes: fields.durationMinutes,
      bufferBeforeMinutes: fields.bufferBeforeMinutes,
      bufferAfterMinutes: fields.bufferAfterMinutes,
      minNoticeHours: fields.minNoticeHours,
      maxAdvanceDays: fields.maxAdvanceDays,
      intakeQuestions: fields.intakeQuestions,
      confirmationSubject: fields.confirmationSubject || null,
      confirmationBody: fields.confirmationBody || null,
      reminderHoursBefore: fields.reminderHoursBefore,
      cancellationPolicy: fields.cancellationPolicy || null,
      minCancelNoticeHours: fields.minCancelNoticeHours,
      allowRescheduling: fields.allowRescheduling,
      isActive: fields.isActive,
      relatedDealStage: fields.relatedDealStage,
      sortOrder: fields.sortOrder,
      weeklyAvailability: fields.useCustomAvailability ? availability : undefined,
    },
  });

  revalidatePath("/booking");
  redirect("/booking");
}

export async function updateMeetingType(id: string, _prevState: MeetingTypeState, formData: FormData): Promise<MeetingTypeState> {
  await requireUser();
  const existing = await prisma.meetingType.findUnique({ where: { id } });
  if (!existing) return { error: "Meeting type not found." };

  const fields = readFields(formData);
  const error = validate(fields);
  if (error) return { error };

  const slug = fields.name !== existing.name ? await uniqueMeetingTypeSlug(fields.name, id) : existing.slug;
  const availability = fields.useCustomAvailability ? parseWeeklyAvailability(formData, "avail-") : [];
  if ("error" in availability) return { error: availability.error };

  await prisma.meetingType.update({
    where: { id },
    data: {
      name: fields.name,
      slug,
      description: fields.description || null,
      durationMinutes: fields.durationMinutes,
      bufferBeforeMinutes: fields.bufferBeforeMinutes,
      bufferAfterMinutes: fields.bufferAfterMinutes,
      minNoticeHours: fields.minNoticeHours,
      maxAdvanceDays: fields.maxAdvanceDays,
      intakeQuestions: fields.intakeQuestions,
      confirmationSubject: fields.confirmationSubject || null,
      confirmationBody: fields.confirmationBody || null,
      reminderHoursBefore: fields.reminderHoursBefore,
      cancellationPolicy: fields.cancellationPolicy || null,
      minCancelNoticeHours: fields.minCancelNoticeHours,
      allowRescheduling: fields.allowRescheduling,
      isActive: fields.isActive,
      relatedDealStage: fields.relatedDealStage,
      sortOrder: fields.sortOrder,
      weeklyAvailability: fields.useCustomAvailability ? availability : Prisma.JsonNull,
    },
  });

  revalidatePath("/booking");
  redirect("/booking");
}

// Meeting types are never hard-deleted — existing bookings keep a real
// (not orphaned/renamed-away) reference to what they booked. Deactivating
// just removes it from the public picker/share link.
export async function toggleMeetingTypeActive(id: string) {
  await requireUser();
  const existing = await prisma.meetingType.findUnique({ where: { id }, select: { isActive: true } });
  if (!existing) return;
  await prisma.meetingType.update({ where: { id }, data: { isActive: !existing.isActive } });
  revalidatePath("/booking");
}
