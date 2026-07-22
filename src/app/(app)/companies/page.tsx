import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SearchBox } from "@/components/search-box";

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
          <h1 className="text-xl font-semibold text-slate-900">Companies</h1>
          <p className="text-sm text-slate-500">
            Businesses you work with or sell to.
          </p>
        </div>
        <Link
          href="/companies/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
        >
          New company
        </Link>
      </div>

      <Suspense>
        <SearchBox key={q ?? ""} placeholder="Search companies…" />
      </Suspense>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {companies.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            {q ? (
              "No companies match your search."
            ) : (
              <>
                No companies yet.{" "}
                <Link href="/companies/new" className="font-medium text-slate-900 underline">
                  Add your first one
                </Link>
                .
              </>
            )}
          </p>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-500">
                  Name
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-500">
                  Website
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-500">
                  Contacts
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-500">
                  Deals
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm">
                    <Link
                      href={`/companies/${company.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {company.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {company.website ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {company._count.contacts}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {company._count.deals}
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
