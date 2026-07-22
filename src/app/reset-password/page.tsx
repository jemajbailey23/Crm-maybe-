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
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">
            Set a new password
          </h1>
        </div>
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="text-sm text-red-600">
            This reset link is missing or invalid.{" "}
            <Link href="/forgot-password" className="font-medium underline">
              Request a new one
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
