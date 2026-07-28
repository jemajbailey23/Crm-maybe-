import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SearchBox } from "@/components/search-box";
import { deleteCompany } from "./actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const companies = await prisma.company.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { website: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { contacts: true, deals: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            Companies
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Businesses you work with or sell to.
          </p>
        </div>
        <Link
          href="/companies/new"
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400"
        >
          New company
        </Link>
      </div>

      <Suspense>
        <SearchBox key={q ?? ""} placeholder="Search companies…" />
      </Suspense>

      <div className="animate-slide-up overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
        {companies.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">
            {q ? (
              "No companies match your search."
            ) : (
              <>
                No companies yet.{" "}
                <Link href="/companies/new" className="font-medium text-indigo-400 hover:text-indigo-300">
                  Add your first one
                </Link>
                .
              </>
            )}
          </p>
        ) : (
          <table className="min-w-full divide-y divide-zinc-800">
            <thead className="bg-zinc-900/60">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Name
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Website
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Contacts
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Deals
                </th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {companies.map((company) => (
                <tr key={company.id} className="group transition-colors hover:bg-zinc-800/30">
                  <td className="px-4 py-3 text-sm">
                    <Link
                      href={`/companies/${company.id}`}
                      className="font-medium text-zinc-100 hover:text-indigo-400"
                    >
                      {company.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {company.website ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {company._count.contacts}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {company._count.deals}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <form action={deleteCompany.bind(null, company.id)}>
                      <ConfirmSubmitButton
                        confirmMessage={`Delete ${company.name}? This can't be undone.`}
                        className="text-xs text-zinc-600 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                      >
                        Delete
                      </ConfirmSubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
