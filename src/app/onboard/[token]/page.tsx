import { prisma } from "@/lib/prisma";
import { OnboardingWizard } from "./onboarding-wizard";

export const dynamic = "force-dynamic";

export default async function OnboardingFormPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const contact = await prisma.contact.findUnique({ where: { onboardingFormToken: token } });

  if (!contact) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16 text-center">
        <p className="text-sm text-zinc-500">
          We couldn&apos;t find a form for this link. It may have been replaced by a newer one —
          reach out if you need a fresh one sent.
        </p>
      </div>
    );
  }

  const brandAssets = await prisma.brandAsset.findMany({
    where: { contactId: contact.id },
    orderBy: { createdAt: "asc" },
  });

  return <OnboardingWizard token={token} contact={contact} brandAssets={brandAssets} />;
}
