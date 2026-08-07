"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { uploadFile, deleteFile } from "@/lib/storage";

export type AttachmentFormState = { error?: string };
export type AttachmentOwner =
  | { contactId: string }
  | { projectId: string }
  | { taskId: string }
  | { articleId: string };

function ownerId(owner: AttachmentOwner) {
  if ("contactId" in owner) return owner.contactId;
  if ("projectId" in owner) return owner.projectId;
  if ("taskId" in owner) return owner.taskId;
  return owner.articleId;
}

function revalidateOwner(owner: AttachmentOwner) {
  if ("contactId" in owner) revalidatePath(`/contacts/${owner.contactId}`);
  else if ("projectId" in owner) revalidatePath(`/projects/${owner.projectId}`);
  else if ("taskId" in owner) revalidatePath(`/tasks/${owner.taskId}`);
  else revalidatePath(`/knowledge/${owner.articleId}`);
}

export async function uploadAttachment(
  owner: AttachmentOwner,
  _prevState: AttachmentFormState,
  formData: FormData
): Promise<AttachmentFormState> {
  await requireUser();
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
  await requireUser();
  const attachment = await prisma.attachment.delete({
    where: { id: attachmentId },
  });
  await deleteFile(attachment.path).catch(() => {});
  if (attachment.contactId) revalidatePath(`/contacts/${attachment.contactId}`);
  if (attachment.projectId) revalidatePath(`/projects/${attachment.projectId}`);
  if (attachment.taskId) revalidatePath(`/tasks/${attachment.taskId}`);
  if (attachment.articleId) revalidatePath(`/knowledge/${attachment.articleId}`);
}
