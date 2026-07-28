"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { BillingType } from "@prisma/client";

export type ServiceFormState = { error?: string };

export async function addService(
  contactId: string,
  _prevState: ServiceFormState,
  formData: FormData
): Promise<ServiceFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const billingTypeRaw = String(formData.get("billingType") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();

  if (!name) return { error: "Service name is required." };

  const billingType = billingTypeRaw === "MONTHLY" ? BillingType.MONTHLY : BillingType.ONE_TIME;
  const amount = amountRaw ? Number(amountRaw) : null;

  await prisma.service.create({
    data: {
      contactId,
      name,
      billingType,
      amount: amount !== null && !Number.isNaN(amount) ? amount : null,
    },
  });

  revalidatePath(`/contacts/${contactId}`);
  return {};
}

export async function deleteService(serviceId: string) {
  const service = await prisma.service.delete({ where: { id: serviceId } });
  revalidatePath(`/contacts/${service.contactId}`);
}
