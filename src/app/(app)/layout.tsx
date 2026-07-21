import { requireUser } from "@/lib/auth";
import { NavLink } from "@/components/nav-link";
import { logout } from "./session-actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-1">
      <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-4">
        <div className="mb-6 px-3">
          <p className="text-sm font-semibold text-slate-900">
            Bailey Ventures Digital
          </p>
          <p className="text-xs text-slate-500">CRM</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          <NavLink href="/dashboard">Dashboard</NavLink>
          <NavLink href="/contacts">Contacts</NavLink>
          <NavLink href="/companies">Companies</NavLink>
          <NavLink href="/deals">Pipeline</NavLink>
          <NavLink href="/tasks">Tasks</NavLink>
        </nav>
        <div className="border-t border-slate-200 pt-3">
          <p className="truncate px-3 text-xs text-slate-500">{user.name}</p>
          <form action={logout}>
            <button
              type="submit"
              className="mt-1 w-full rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 bg-slate-50 px-8 py-6">{children}</main>
    </div>
  );
}
