"use server";

import { revalidatePath } from "next/cache";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";

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
};

function normalizeHeader(header: string) {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
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
    const rowNumber = i + 2; // account for the header row, 1-indexed

    if (!firstName || !lastName) {
      skipped.push({ row: rowNumber, reason: "Missing first or last name" });
      continue;
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
        email: row.email || null,
        phone: row.phone || null,
        title: row.title || null,
        tags: row.tags || null,
        notes: row.notes || null,
        companyId,
      },
    });
    imported++;
  }

  revalidatePath("/contacts");
  revalidatePath("/companies");

  return { result: { imported, companiesCreated, skipped } };
}
