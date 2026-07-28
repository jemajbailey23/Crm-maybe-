"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";

export function NavLink({
  href,
  icon,
  children,
}: {
  href: Route;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
        active
          ? "bg-zinc-800/80 text-zinc-50"
          : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"
      }`}
    >
      {icon && (
        <span
          className={`transition-colors ${
            active
              ? "text-indigo-400"
              : "text-zinc-600 group-hover:text-zinc-400"
          }`}
        >
          {icon}
        </span>
      )}
      {children}
    </Link>
  );
}
