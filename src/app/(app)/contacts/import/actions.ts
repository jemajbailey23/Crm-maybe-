"use server";

import { revalidatePath } from "next/cache";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import { Priority } from "@prisma/client";

export type ImportState = {
  error?: string;
  result?: {
    imported: number;
    companiesCreated: number;
    skipped: { row: number; reason: string }[];
  };
};

const HEADER_ALIASES: Record<string, string> = {
  firstname: "firstName",
  first: "firstName",
  lastname: "lastName",
  last: "lastName",
  email: "email",
  emailaddress: "email",
  phone: "phone",
  phonenumber: "phone",
  title: "title",
  jobtitle: "title",
  company: "company",
  companyname: "company",
  organization: "company",
  tags: "tags",
  notes: "notes",
  note: "notes",
  // Business-lead-list fields (e.g. a prospecting tracker with no
  // individual contact name yet — see businessName handling below).
  businessname: "businessName",
  business: "businessName",
  niche: "industry",
  industry: "industry",
  website: "website",
  address: "address",
  priority: "priority",
  leadpriority: "priority",
  leadsource: "leadSource",
  source: "leadSource",
  nextfollowup: "nextFollowUpAt",
  nextfollowupat: "nextFollowUpAt",
  nextfollowupdate: "nextFollowUpAt",
  followupdate: "nextFollowUpAt",
  currentproblems: "currentProblems",
  whythislead: "currentProblems",
};

const PRIORITY_VALUES = Object.values(Priority);

function normalizeHeader(header: string) {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parsePriority(raw: string | undefined): Priority | undefined {
  if (!raw) return undefined;
  const upper = raw.trim().toUpperCase();
  return PRIORITY_VALUES.includes(upper as Priority) ? (upper as Priority) : undefined;
}

function parseDate(raw: string | undefined): Date | undefined {
  if (!raw?.trim()) return undefined;
  const parsed = new Date(raw.trim());
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export async function importContactsCsv(
  _prevState: ImportState,
  formData: FormData
): Promise<ImportState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a CSV file to import." };
  }

  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.data.length === 0) {
    return { error: "That file has no rows to import." };
  }

  const companyCache = new Map<string, string>();
  // Bugfix: importing used to create a brand-new Contact for every row,
  // unconditionally — re-uploading the same file (or the same lead
  // appearing in two source lists) duplicated every contact. These sets
  // track identifiers already matched *within this run* so two rows in
  // the same file that describe the same person/business are caught too,
  // not just repeats across separate import runs (which the DB lookups
  // below catch).
  const seenEmails = new Set<string>();
  const seenBusinessNames = new Set<string>();
  const seenPersonNames = new Set<string>();
  let companiesCreated = 0;
  let imported = 0;
  const skipped: { row: number; reason: string }[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const rawRow = parsed.data[i];
    const row: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawRow)) {
      const field = HEADER_ALIASES[normalizeHeader(key)];
      if (field) row[field] = (value ?? "").toString().trim();
    }

    const firstName = row.firstName ?? "";
    const lastName = row.lastName ?? "";
    const businessName = row.businessName || null;
    const rowNumber = i + 2; // account for the header row, 1-indexed

    // A row needs *some* identifying name — either a person's first/last
    // name, or (for business-lead lists that don't have a contact person
    // yet) a business name. Everything else is optional.
    if (!firstName && !lastName && !businessName) {
      skipped.push({ row: rowNumber, reason: "Missing a name (first/last name or business name)" });
      continue;
    }
    if ((firstName && !lastName) || (!firstName && lastName)) {
      skipped.push({ row: rowNumber, reason: "Has a first name or last name but not both" });
      continue;
    }

    // Dedup: prefer email as the identifier (matches the convention used
    // by booking-engine.ts's findOrCreateContact), fall back to business
    // name for business-only leads, then to an exact first+last name
    // match for person rows with no email at all. A row that matches an
    // existing contact by whichever identifier it has is skipped rather
    // than creating a duplicate.
    const email = row.email || null;
    if (email) {
      const key = email.toLowerCase();
      if (seenEmails.has(key)) {
        skipped.push({ row: rowNumber, reason: `Duplicate email in this file (${email})` });
        continue;
      }
      const existing = await prisma.contact.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
      });
      if (existing) {
        skipped.push({ row: rowNumber, reason: `Contact already exists (matched by email: ${email})` });
        continue;
      }
      seenEmails.add(key);
    } else if (businessName) {
      const key = businessName.toLowerCase();
      if (seenBusinessNames.has(key)) {
        skipped.push({ row: rowNumber, reason: `Duplicate business name in this file (${businessName})` });
        continue;
      }
      const existing = await prisma.contact.findFirst({
        where: { businessName: { equals: businessName, mode: "insensitive" } },
      });
      if (existing) {
        skipped.push({ row: rowNumber, reason: `Contact already exists (matched by business name: ${businessName})` });
        continue;
      }
      seenBusinessNames.add(key);
    } else {
      const key = `${firstName.toLowerCase()} ${lastName.toLowerCase()}`;
      if (seenPersonNames.has(key)) {
        skipped.push({ row: rowNumber, reason: `Duplicate name in this file (${firstName} ${lastName})` });
        continue;
      }
      const existing = await prisma.contact.findFirst({
        where: {
          firstName: { equals: firstName, mode: "insensitive" },
          lastName: { equals: lastName, mode: "insensitive" },
        },
      });
      if (existing) {
        skipped.push({
          row: rowNumber,
          reason: `Contact already exists (matched by name: ${firstName} ${lastName} — no email to disambiguate)`,
        });
        continue;
      }
      seenPersonNames.add(key);
    }

    let companyId: string | null = null;
    const companyName = row.company;
    if (companyName) {
      const cacheKey = companyName.toLowerCase();
      const cached = companyCache.get(cacheKey);
      if (cached) {
        companyId = cached;
      } else {
        const existing = await prisma.company.findFirst({
          where: { name: { equals: companyName, mode: "insensitive" } },
        });
        if (existing) {
          companyId = existing.id;
        } else {
          const created = await prisma.company.create({ data: { name: companyName } });
          companyId = created.id;
          companiesCreated++;
        }
        companyCache.set(cacheKey, companyId);
      }
    }

    await prisma.contact.create({
      data: {
        firstName,
        lastName,
        email,
        phone: row.phone || null,
        title: row.title || null,
        tags: row.tags || null,
        notes: row.notes || null,
        companyId,
        businessName,
        industry: row.industry || null,
        website: row.website || null,
        address: row.address || null,
        priority: parsePriority(row.priority) ?? Priority.MEDIUM,
        leadSource: row.leadSource || null,
        nextFollowUpAt: parseDate(row.nextFollowUpAt) ?? null,
        currentProblems: row.currentProblems || null,
      },
    });
    imported++;
  }

  revalidatePath("/contacts");
  revalidatePath("/companies");

  return { result: { imported, companiesCreated, skipped } };
}
