import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ArticleForm } from "../article-form";
import { createArticle } from "../actions";

export default async function NewArticlePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const user = await requireUser();
  const { category } = await searchParams;

  const [clients, owners] = await Promise.all([
    prisma.contact.findMany({
      where: { status: "CLIENT" },
      orderBy: [{ businessName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true, businessName: true },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const clientOptions = clients.map((c) => ({
    id: c.id,
    label: c.businessName || `${c.firstName} ${c.lastName}`,
  }));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">New article</h1>
        <p className="mt-1 text-sm text-zinc-500">Add a new entry to the knowledge base.</p>
      </div>
      <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
        <ArticleForm
          action={createArticle}
          clients={clientOptions}
          owners={owners}
          currentUserId={user.id}
          defaultValues={category ? { category } : undefined}
        />
      </div>
    </div>
  );
}
