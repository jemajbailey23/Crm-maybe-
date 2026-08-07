import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ArticleForm } from "../../article-form";
import { updateArticle } from "../../actions";

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const [article, clients, owners] = await Promise.all([
    prisma.knowledgeArticle.findUnique({ where: { id } }),
    prisma.contact.findMany({
      where: { status: "CLIENT" },
      orderBy: [{ businessName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true, businessName: true },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!article) notFound();

  const clientOptions = clients.map((c) => ({
    id: c.id,
    label: c.businessName || `${c.firstName} ${c.lastName}`,
  }));
  const updateArticleWithId = updateArticle.bind(null, article.id);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href={`/knowledge/${article.id}`} className="text-xs text-zinc-500 hover:text-zinc-300">
          ← Back to article
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50">Edit article</h1>
        <p className="mt-1 text-sm text-zinc-500">{article.title}</p>
      </div>
      <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
        <ArticleForm
          action={updateArticleWithId}
          articleId={article.id}
          clients={clientOptions}
          owners={owners}
          currentUserId={user.id}
          defaultValues={{
            title: article.title,
            summary: article.summary,
            content: article.content,
            category: article.category,
            tags: article.tags ?? "",
            status: article.status,
            visibility: article.visibility,
            clientId: article.clientId,
            ownerId: article.ownerId ?? user.id,
            aiEnabled: article.aiEnabled,
            reviewDate: article.reviewDate,
          }}
        />
      </div>
    </div>
  );
}
