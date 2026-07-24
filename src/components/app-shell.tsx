"use client";

import { useState } from "react";
import Link from "next/link";
import { NavLink } from "@/components/nav-link";
import { logout } from "@/app/(app)/session-actions";

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-1" onClick={onNavigate}>
      <NavLink href="/dashboard">Dashboard</NavLink>
      <NavLink href="/contacts">Contacts</NavLink>
      <NavLink href="/companies">Companies</NavLink>
      <NavLink href="/deals">Pipeline</NavLink>
      <NavLink href="/tasks">Tasks</NavLink>
      <NavLink href="/booking">Booking</NavLink>
    </nav>
  );
}

function UserFooter({ userName }: { userName: string }) {
  return (
    <div className="border-t border-slate-200 pt-3">
      <Link
        href="/account"
        className="block truncate rounded-md px-3 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      >
        {userName}
      </Link>
      <form action={logout}>
        <button
          type="submit"
          className="mt-1 w-full rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}

export function AppShell({
  userName,
  children,
}: {
  userName: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Bailey Ventures Digital
          </p>
          <p className="text-xs text-slate-500">CRM</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-6 w-6"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-64 flex-col bg-white px-3 py-4 shadow-lg">
            <div className="mb-6 flex items-center justify-between px-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Bailey Ventures Digital
                </p>
                <p className="text-xs text-slate-500">CRM</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-5 w-5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <NavItems onNavigate={() => setOpen(false)} />
            <UserFooter userName={userName} />
          </div>
        </div>
      )}

      <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-4 md:flex">
        <div className="mb-6 px-3">
          <p className="text-sm font-semibold text-slate-900">
            Bailey Ventures Digital
          </p>
          <p className="text-xs text-slate-500">CRM</p>
        </div>
        <NavItems />
        <UserFooter userName={userName} />
      </aside>

      <main className="flex-1 bg-slate-50 px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
