"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export type ContactFormState = { error?: string };

function parseContactFields(formData: FormData) {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const tags = String(formData.get("tags") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const companyId = String(formData.get("companyId") ?? "").trim();

  return {
    firstName,
    lastName,
    email: email || null,
    phone: phone || null,
    title: title || null,
    tags: tags || null,
    notes: notes || null,
    companyId: companyId || null,
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
  return {};
}

export async function deleteContact(contactId: string) {
  await prisma.contact.delete({ where: { id: contactId } });
  revalidatePath("/contacts");
  redirect("/contacts");
}
