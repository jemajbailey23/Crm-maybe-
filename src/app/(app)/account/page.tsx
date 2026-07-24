import { requireUser } from "@/lib/auth";
import { ChangeEmailForm } from "./change-email-form";

export default async function AccountPage() {
  const user = await requireUser();

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Account</h1>
        <p className="text-sm text-slate-500">
          Manage the email you use to log in and receive notifications.
        </p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <p className="mb-4 text-sm text-slate-600">
          Current email: <span className="font-medium text-slate-900">{user.email}</span>
        </p>
        <ChangeEmailForm />
      </section>
    </div>
  );
}
