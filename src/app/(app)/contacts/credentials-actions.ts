"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

export type CredentialFormState = { error?: string };

export async function addCredential(
  contactId: string,
  _prevState: CredentialFormState,
  formData: FormData
): Promise<CredentialFormState> {
  const label = String(formData.get("label") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const secret = String(formData.get("secret") ?? "");
  const url = String(formData.get("url") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!label) return { error: "Label is required." };
  if (!secret) return { error: "Password / secret value is required." };

  let encrypted: string;
  try {
    encrypted = encryptSecret(secret);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Encryption failed." };
  }

  await prisma.credential.create({
    data: {
      contactId,
      label,
      username: username || null,
      secret: encrypted,
      url: url || null,
      notes: notes || null,
    },
  });

  revalidatePath(`/contacts/${contactId}`);
  return {};
}

// Every reveal requires an authenticated session — this is the only path
// that ever returns a decrypted secret to the client.
export async function revealCredential(credentialId: string): Promise<string> {
  await requireUser();
  const credential = await prisma.credential.findUnique({
    where: { id: credentialId },
    select: { secret: true },
  });
  if (!credential) throw new Error("Credential not found.");
  return decryptSecret(credential.secret);
}

export async function deleteCredential(credentialId: string) {
  const credential = await prisma.credential.delete({ where: { id: credentialId } });
  revalidatePath(`/contacts/${credential.contactId}`);
}
