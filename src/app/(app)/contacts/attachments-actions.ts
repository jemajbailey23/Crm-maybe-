"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { uploadFile, deleteFile } from "@/lib/storage";

export type AttachmentFormState = { error?: string };
export type AttachmentOwner =
  | { contactId: string }
  | { projectId: string }
  | { taskId: string };

function ownerId(owner: AttachmentOwner) {
  if ("contactId" in owner) return owner.contactId;
  if ("projectId" in owner) return owner.projectId;
  return owner.taskId;
}

function revalidateOwner(owner: AttachmentOwner) {
  if ("contactId" in owner) revalidatePath(`/contacts/${owner.contactId}`);
  else if ("projectId" in owner) revalidatePath(`/projects/${owner.projectId}`);
  else revalidatePath(`/tasks/${owner.taskId}`);
}

export async function uploadAttachment(
  owner: AttachmentOwner,
  _prevState: AttachmentFormState,
  formData: FormData
): Promise<AttachmentFormState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }

  const path = `${ownerId(owner)}/${randomUUID()}-${file.name}`;

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

  revalidateOwner(owner);
  return {};
}

export async function deleteAttachment(attachmentId: string) {
  const attachment = await prisma.attachment.delete({
    where: { id: attachmentId },
  });
  await deleteFile(attachment.path).catch(() => {});
  if (attachment.contactId) revalidatePath(`/contacts/${attachment.contactId}`);
  if (attachment.projectId) revalidatePath(`/projects/${attachment.projectId}`);
  if (attachment.taskId) revalidatePath(`/tasks/${attachment.taskId}`);
}
