"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { runReconciliation } from "@/lib/reconciliation";

// Reconciliation calls the live Stripe API for two of its six checks, so
// it's triggered on demand from a button rather than run on every page
// load — see the "known limitations" note in the Stage 6 report for why
// there's no background schedule doing this automatically.
export async function runReconciliationAction() {
  await runReconciliation();
  revalidatePath("/financials");
}

export async function resolveAlert(alertId: string) {
  await prisma.reconciliationAlert.update({
    where: { id: alertId },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });
  revalidatePath("/financials");
}

export async function ignoreAlert(alertId: string) {
  await prisma.reconciliationAlert.update({
    where: { id: alertId },
    data: { status: "IGNORED", resolvedAt: new Date() },
  });
  revalidatePath("/financials");
}
