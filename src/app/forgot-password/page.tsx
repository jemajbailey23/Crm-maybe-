import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ForgotPasswordForm } from "./forgot-password-form";

export default async function ForgotPasswordPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">
            Reset your password
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Enter your account email and we&apos;ll send a reset link.
          </p>
        </div>
        <ForgotPasswordForm />
        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/login" className="font-medium text-slate-900 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
