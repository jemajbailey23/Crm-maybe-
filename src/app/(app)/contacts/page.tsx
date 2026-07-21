import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function ContactsPage() {
  const contacts = await prisma.contact.findMany({
    orderBy: { createdAt: "desc" },
    include: { company: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Contacts</h1>
          <p className="text-sm text-slate-500">
            Everyone you&apos;re doing business with.
          </p>
        </div>
        <Link
          href="/contacts/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
        >
          New contact
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {contacts.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            No contacts yet.{" "}
            <Link href="/contacts/new" className="font-medium text-slate-900 underline">
              Add your first one
            </Link>
            .
          </p>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-500">
                  Name
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-500">
                  Company
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-500">
                  Email
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-500">
                  Phone
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm">
                    <Link
                      href={`/contacts/${contact.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {contact.firstName} {contact.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {contact.company?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {contact.email ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
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
