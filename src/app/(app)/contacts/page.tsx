import { Suspense } from "react";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SearchBox } from "@/components/search-box";
import { Pagination } from "@/components/ui/pagination";
import { deleteContact } from "./actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { BulkSelectProvider, RowCheckbox, SelectAllCheckbox } from "@/components/ui/bulk-select";
import { ContactsBulkBar } from "./contacts-bulk-bar";

const PAGE_SIZE = 50;

function exportQuery(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { q, status, page: pageRaw } = await searchParams;
  const statusFilter = status === "LEAD" || status === "CLIENT" ? status : undefined;
  const page = Math.max(1, Math.trunc(Number(pageRaw)) || 1);

  const where: Prisma.ContactWhereInput = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" as const } },
            { lastName: { contains: q, mode: "insensitive" as const } },
            { businessName: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q, mode: "insensitive" as const } },
            { company: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [contacts, totalCount] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { company: true },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.contact.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            Contacts
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {statusFilter === "LEAD"
              ? "Leads only."
              : statusFilter === "CLIENT"
                ? "Clients only."
                : "Everyone you're doing business with."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/contacts/export${exportQuery({ q, status })}`}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
          >
            Export CSV
          </Link>
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

      <BulkSelectProvider>
        <ContactsBulkBar />
        <div className="mt-3" />
      <div className="animate-slide-up overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/50">
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
                <th className="w-10 px-4 py-2.5">
                  <SelectAllCheckbox ids={contacts.map((c) => c.id)} />
                </th>
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
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {contacts.map((contact) => {
                // Business-only leads (imported with no individual contact
                // name yet) fall back to the business name, same convention
                // already used on the contact detail page.
                const displayName =
                  `${contact.firstName} ${contact.lastName}`.trim() || contact.businessName || "Unnamed contact";
                return (
                <tr key={contact.id} className="group transition-colors hover:bg-zinc-800/30">
                  <td className="px-4 py-3">
                    <RowCheckbox id={contact.id} label={displayName} />
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Link
                      href={`/contacts/${contact.id}`}
                      className="font-medium text-zinc-100 hover:text-indigo-400"
                    >
                      {displayName}
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
                  <td className="px-4 py-3 text-right text-sm">
                    <form action={deleteContact.bind(null, contact.id)}>
                      <ConfirmSubmitButton
                        confirmMessage={`Delete ${displayName}? This can't be undone.`}
                        className="text-xs text-zinc-600 transition-opacity hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        Delete
                      </ConfirmSubmitButton>
                    </form>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={totalCount}
          basePath="/contacts"
          searchParams={{ q, status }}
        />
      </div>
      </BulkSelectProvider>
    </div>
  );
}
