import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ForgotPasswordForm } from "./forgot-password-form";

export default async function ForgotPasswordPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="animate-slide-up w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-50">
            Reset your password
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Enter your account email and we&apos;ll send a reset link.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <ForgotPasswordForm />
        </div>
        <p className="mt-6 text-center text-sm text-zinc-500">
          <Link href="/login" className="font-medium text-indigo-400 hover:text-indigo-300">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
