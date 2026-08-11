"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { uniqueMeetingTypeSlug } from "@/lib/slug";
import { DEFAULT_MEETING_TYPES } from "./default-meeting-types";

export type ImportResult = { created: number; skipped: number };

// Seeds the 5 required Stage 7 meeting types (Discovery Call, Strategy
// Session, Client Kickoff, Monthly Review, Support Call). Safe to click
// more than once: any name that already exists is skipped rather than
// duplicated, matching the Knowledge Base starter-pack importer's pattern.
export async function importDefaultMeetingTypes(): Promise<ImportResult> {
  await requireUser();

  const existing = await prisma.meetingType.findMany({
    where: { name: { in: DEFAULT_MEETING_TYPES.map((t) => t.name) } },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((t) => t.name));

  let created = 0;
  let skipped = 0;

  for (const type of DEFAULT_MEETING_TYPES) {
    if (existingNames.has(type.name)) {
      skipped++;
      continue;
    }
    const slug = await uniqueMeetingTypeSlug(type.name);
    await prisma.meetingType.create({
      data: { ...type, slug, isActive: true },
    });
    created++;
  }

  revalidatePath("/booking");
  return { created, skipped };
}
