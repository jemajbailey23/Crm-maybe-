import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SignupForm } from "./signup-form";

// Whether signup is allowed depends on live user count — never prerender.
export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const userCount = await prisma.user.count();
  if (userCount > 0) redirect("/login");

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="animate-slide-up w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/20">
            BV
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-50">
            Bailey Ventures Digital
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Create the first account to set up your CRM.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <SignupForm />
        </div>
      </div>
    </div>
  );
}
