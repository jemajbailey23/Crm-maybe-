import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SignupForm } from "./signup-form";

export default async function SignupPage() {
  const userCount = await prisma.user.count();
  if (userCount > 0) redirect("/login");

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">
            Bailey Ventures Digital
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Create the first account to set up your CRM.
          </p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
