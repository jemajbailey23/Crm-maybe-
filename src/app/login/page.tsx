import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">
            Bailey Ventures Digital
          </h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your CRM.</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
