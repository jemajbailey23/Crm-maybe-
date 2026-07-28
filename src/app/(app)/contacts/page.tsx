import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SearchBox } from "@/components/search-box";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const contacts = await prisma.contact.findMany({
    where: q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { company: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: { company: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            Contacts
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Everyone you&apos;re doing business with.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/contacts/import"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
          >
            Import CSV
          </Link>
          <Link
            href="/contacts/new"
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400"
          >
            New contact
          </Link>
        </div>
      </div>

      <Suspense>
        <SearchBox key={q ?? ""} placeholder="Search contacts…" />
      </Suspense>

      <div className="animate-slide-up overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
        {contacts.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">
            {q ? (
              "No contacts match your search."
            ) : (
              <>
                No contacts yet.{" "}
                <Link href="/contacts/new" className="font-medium text-indigo-400 hover:text-indigo-300">
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
                  Company
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Email
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Phone
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {contacts.map((contact) => (
                <tr key={contact.id} className="transition-colors hover:bg-zinc-800/30">
                  <td className="px-4 py-3 text-sm">
                    <Link
                      href={`/contacts/${contact.id}`}
                      className="font-medium text-zinc-100 hover:text-indigo-400"
                    >
                      {contact.firstName} {contact.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {contact.company?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {contact.email ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {contact.phone ?? "—"}
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
