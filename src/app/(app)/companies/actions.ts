"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export type CompanyFormState = { error?: string };

function parseCompanyFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  return {
    name,
    website: website || null,
    phone: phone || null,
    notes: notes || null,
  };
}

export async function createCompany(
  _prevState: CompanyFormState,
  formData: FormData
): Promise<CompanyFormState> {
  const fields = parseCompanyFields(formData);
  if (!fields.name) {
    return { error: "Company name is required." };
  }

  const company = await prisma.company.create({ data: fields });
  revalidatePath("/companies");
  redirect(`/companies/${company.id}`);
}

export async function updateCompany(
  companyId: string,
  _prevState: CompanyFormState,
  formData: FormData
): Promise<CompanyFormState> {
  const fields = parseCompanyFields(formData);
  if (!fields.name) {
    return { error: "Company name is required." };
  }

  await prisma.company.update({ where: { id: companyId }, data: fields });
  revalidatePath("/companies");
  revalidatePath(`/companies/${companyId}`);
  return {};
}

export async function deleteCompany(companyId: string) {
  await prisma.company.delete({ where: { id: companyId } });
  revalidatePath("/companies");
  redirect("/companies");
}
