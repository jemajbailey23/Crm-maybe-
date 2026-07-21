"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";

export function NavLink({
  href,
  children,
}: {
  href: Route;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-slate-900 text-white"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {children}
    </Link>
  );
}
