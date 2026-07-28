"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { uploadFile, deleteFile } from "@/lib/storage";

export type AttachmentFormState = { error?: string };

export async function uploadAttachment(
  contactId: string,
  _prevState: AttachmentFormState,
  formData: FormData
): Promise<AttachmentFormState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }

  const path = `${contactId}/${randomUUID()}-${file.name}`;

  let url: string;
  try {
    url = await uploadFile(path, file);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed." };
  }

  await prisma.attachment.create({
    data: {
      contactId,
      filename: file.name,
      path,
      url,
      sizeBytes: file.size,
      mimeType: file.type || null,
    },
  });

  revalidatePath(`/contacts/${contactId}`);
  return {};
}

export async function deleteAttachment(attachmentId: string) {
  const attachment = await prisma.attachment.delete({
    where: { id: attachmentId },
  });
  await deleteFile(attachment.path).catch(() => {});
  revalidatePath(`/contacts/${attachment.contactId}`);
}
