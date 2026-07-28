"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { uploadFile, deleteFile } from "@/lib/storage";

export type AttachmentFormState = { error?: string };
export type AttachmentOwner = { contactId: string } | { projectId: string };

export async function uploadAttachment(
  owner: AttachmentOwner,
  _prevState: AttachmentFormState,
  formData: FormData
): Promise<AttachmentFormState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }

  const ownerId = "contactId" in owner ? owner.contactId : owner.projectId;
  const path = `${ownerId}/${randomUUID()}-${file.name}`;

  let url: string;
  try {
    url = await uploadFile(path, file);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed." };
  }

  await prisma.attachment.create({
    data: {
      ...owner,
      filename: file.name,
      path,
      url,
      sizeBytes: file.size,
      mimeType: file.type || null,
    },
  });

  if ("contactId" in owner) revalidatePath(`/contacts/${owner.contactId}`);
  else revalidatePath(`/projects/${owner.projectId}`);
  return {};
}

export async function deleteAttachment(attachmentId: string) {
  const attachment = await prisma.attachment.delete({
    where: { id: attachmentId },
  });
  await deleteFile(attachment.path).catch(() => {});
  if (attachment.contactId) revalidatePath(`/contacts/${attachment.contactId}`);
  if (attachment.projectId) revalidatePath(`/projects/${attachment.projectId}`);
}
