"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { uploadFile, deleteFile } from "@/lib/storage";

export type AgreementFormState = { error?: string };

// Deliberately separate from the generic attachments-actions.ts upload —
// this writes to Contact's own agreement* fields (a single dedicated
// slot) rather than creating an Attachment row, so "where's the signed
// contract" always has one obvious answer instead of being buried in a
// pile of files.
export async function uploadAgreement(
  contactId: string,
  _prevState: AgreementFormState,
  formData: FormData
): Promise<AgreementFormState> {
  await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }

  const existing = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { agreementPath: true },
  });

  const path = `agreements/${contactId}/${randomUUID()}-${file.name}`;
  let url: string;
  try {
    url = await uploadFile(path, file);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed." };
  }

  await prisma.contact.update({
    where: { id: contactId },
    data: {
      agreementFileUrl: url,
      agreementFilename: file.name,
      agreementPath: path,
      agreementUploadedAt: new Date(),
      // A replaced document needs to be confirmed signed again — carrying
      // the old flag over would be a silent, incorrect assumption.
      agreementSigned: false,
    },
  });

  if (existing?.agreementPath) await deleteFile(existing.agreementPath).catch(() => {});

  revalidatePath(`/contacts/${contactId}`);
  return {};
}

export async function setAgreementSigned(contactId: string, signed: boolean) {
  await requireUser();
  await prisma.contact.update({ where: { id: contactId }, data: { agreementSigned: signed } });
  revalidatePath(`/contacts/${contactId}`);
}

export async function removeAgreement(contactId: string) {
  await requireUser();
  const existing = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { agreementPath: true },
  });

  await prisma.contact.update({
    where: { id: contactId },
    data: {
      agreementFileUrl: null,
      agreementFilename: null,
      agreementPath: null,
      agreementUploadedAt: null,
      agreementSigned: false,
    },
  });

  if (existing?.agreementPath) await deleteFile(existing.agreementPath).catch(() => {});
  revalidatePath(`/contacts/${contactId}`);
}
