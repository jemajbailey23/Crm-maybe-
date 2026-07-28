import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const { token } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="animate-slide-up w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-50">
            Set a new password
          </h1>
        </div>
        {token ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <ResetPasswordForm token={token} />
          </div>
        ) : (
          <p className="text-sm text-red-400">
            This reset link is missing or invalid.{" "}
            <Link href="/forgot-password" className="font-medium text-indigo-400 hover:text-indigo-300">
              Request a new one
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
