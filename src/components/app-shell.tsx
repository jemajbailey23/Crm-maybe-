"use client";

import { useState } from "react";
import Link from "next/link";
import { NavLink } from "@/components/nav-link";
import { CommandPalette } from "@/components/command-palette";
import { logout } from "@/app/(app)/session-actions";
import {
  DashboardIcon,
  ContactsIcon,
  CompaniesIcon,
  PipelineIcon,
  ProjectsIcon,
  TasksIcon,
  FinancialsIcon,
  KnowledgeIcon,
  BookingIcon,
} from "@/components/icons";

function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white shadow-lg shadow-indigo-500/20">
        BV
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-zinc-100">
          Bailey Ventures
        </p>
        <p className="text-[11px] text-zinc-500">Digital · CRM</p>
      </div>
    </div>
  );
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-0.5" onClick={onNavigate}>
      <NavLink href="/dashboard" icon={<DashboardIcon />}>
        Dashboard
      </NavLink>
      <NavLink href="/contacts" icon={<ContactsIcon />}>
        Contacts
      </NavLink>
      <NavLink href="/companies" icon={<CompaniesIcon />}>
        Companies
      </NavLink>
      <NavLink href="/deals" icon={<PipelineIcon />}>
        Pipeline
      </NavLink>
      <NavLink href="/projects" icon={<ProjectsIcon />}>
        Projects
      </NavLink>
      <NavLink href="/tasks" icon={<TasksIcon />}>
        Tasks
      </NavLink>
      <NavLink href="/financials" icon={<FinancialsIcon />}>
        Financials
      </NavLink>
      <NavLink href="/knowledge" icon={<KnowledgeIcon />}>
        Knowledge
      </NavLink>
      <NavLink href="/booking" icon={<BookingIcon />}>
        Booking
      </NavLink>
    </nav>
  );
}

function UserFooter({ userName }: { userName: string }) {
  return (
    <div className="border-t border-zinc-800 pt-3">
      <Link
        href="/account"
        className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:bg-zinc-800/40 hover:text-zinc-300"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-semibold text-zinc-300">
          {userName.charAt(0).toUpperCase()}
        </span>
        <span className="truncate">{userName}</span>
      </Link>
      <form action={logout}>
        <button
          type="submit"
          className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-500 transition-colors hover:bg-zinc-800/40 hover:text-zinc-300"
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
    <div className="flex min-h-screen flex-1 flex-col bg-zinc-950 md:flex-row">
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-4 py-3 backdrop-blur-sm md:hidden">
        <Logo />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-md p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
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
            className="animate-overlay-in absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <div className="animate-slide-up absolute left-0 top-0 flex h-full w-64 flex-col border-r border-zinc-800 bg-zinc-950 px-3 py-4 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <Logo />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
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
            <div className="mb-4">
              <CommandPalette />
            </div>
            <NavItems onNavigate={() => setOpen(false)} />
            <UserFooter userName={userName} />
          </div>
        </div>
      )}

      <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 px-3 py-4 md:flex">
        <div className="mb-5">
          <Logo />
        </div>
        <div className="mb-4">
          <CommandPalette />
        </div>
        <NavItems />
        <UserFooter userName={userName} />
      </aside>

      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="animate-fade-in mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
