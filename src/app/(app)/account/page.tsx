import { requireUser } from "@/lib/auth";
import { ChangeEmailForm } from "./change-email-form";
import { ChangeNameForm } from "./change-name-form";

export default async function AccountPage() {
  const user = await requireUser();

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Account</h1>
        <p className="text-sm text-slate-500">
          Manage your name and the email you use to log in and receive
          notifications.
        </p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Name</h2>
        <ChangeNameForm currentName={user.name} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Email</h2>
        <p className="mb-4 text-sm text-slate-600">
          Current email: <span className="font-medium text-slate-900">{user.email}</span>
        </p>
        <ChangeEmailForm />
      </section>
    </div>
  );
}
