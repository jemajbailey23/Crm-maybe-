import { requireUser } from "@/lib/auth";
import { ChangeEmailForm } from "./change-email-form";
import { ChangeNameForm } from "./change-name-form";

export default async function AccountPage() {
  const user = await requireUser();

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Account</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage your name and the email you use to log in and receive
          notifications.
        </p>
      </div>

      <section className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">Name</h2>
        <ChangeNameForm currentName={user.name} />
      </section>

      <section className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">Email</h2>
        <p className="mb-4 text-sm text-zinc-400">
          Current email: <span className="font-medium text-zinc-100">{user.email}</span>
        </p>
        <ChangeEmailForm />
      </section>
    </div>
  );
}
