import { prisma } from "@/lib/prisma";
import { OnboardingForm } from "./onboarding-form";

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

  return (
    <div className="flex flex-1 justify-center px-4 py-12">
      <div className="animate-slide-up w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/20">
            BV
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Let&apos;s get you set up</h1>
          <p className="mt-1 text-sm text-zinc-500">
            A few details about your business so we can get started — takes about a minute.
          </p>
          {contact.onboardingFormSubmittedAt && (
            <p className="mt-2 text-xs text-emerald-400">
              Submitted{" "}
              {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(contact.onboardingFormSubmittedAt)} —
              you can update your answers anytime below.
            </p>
          )}
        </div>
        <OnboardingForm token={token} defaultValues={contact} />
      </div>
    </div>
  );
}
