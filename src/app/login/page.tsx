import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

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
          <p className="mt-1 text-sm text-zinc-500">Sign in to your CRM.</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-sm text-zinc-500">
          <Link href="/forgot-password" className="font-medium text-indigo-400 hover:text-indigo-300">
            Forgot your password?
          </Link>
        </p>
      </div>
    </div>
  );
}
