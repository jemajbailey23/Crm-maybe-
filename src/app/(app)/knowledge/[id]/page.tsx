import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { archiveArticle, duplicateArticle, deleteArticle } from "../actions";
import { CATEGORY_LABEL } from "../categories";
import { ArticleContent } from "../article-content";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { CopyLinkButton } from "@/components/copy-link-button";
import { KnowledgeStatusBadge, KnowledgeVisibilityBadge, AiEnabledBadge, LabelChips } from "@/components/ui/badge";

function formatDate(date: Date | null) {
  if (!date) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default async function ArticleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const article = await prisma.knowledgeArticle.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, firstName: true, lastName: true, businessName: true } },
      owner: { select: { id: true, name: true } },
      revisions: { orderBy: { createdAt: "desc" }, take: 10, include: { editedBy: { select: { name: true } } } },
    },
  });
  if (!article) notFound();

  const clientName = article.client
    ? article.client.businessName || `${article.client.firstName} ${article.client.lastName}`
    : null;

  const now = new Date();
  const reviewDue = article.reviewDate && article.reviewDate <= now;

  const archiveArticleWithId = archiveArticle.bind(null, article.id);
  const duplicateArticleWithId = duplicateArticle.bind(null, article.id);
  const deleteArticleWithId = deleteArticle.bind(null, article.id);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/knowledge" className="text-xs text-zinc-500 hover:text-zinc-300">
            ← Knowledge base
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50">{article.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <KnowledgeStatusBadge status={article.status} />
            <KnowledgeVisibilityBadge visibility={article.visibility} />
            <AiEnabledBadge enabled={article.aiEnabled} />
            {reviewDue && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400 ring-1 ring-inset ring-amber-500/20">
                Review due
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CopyLinkButton text={article.content} label="Copy content" />
          <Link
            href={`/knowledge/${article.id}/edit`}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
          >
            Edit
          </Link>
          <form action={duplicateArticleWithId}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
            >
              Duplicate
            </button>
          </form>
          {article.status !== "ARCHIVED" && (
            <form action={archiveArticleWithId}>
              <ConfirmSubmitButton
                confirmMessage={`Archive "${article.title}"? It will no longer be shown in default list views and, if AI-enabled, will stop being used by the AI Assistant.`}
                className="rounded-lg border border-amber-500/30 px-3 py-1.5 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/10"
              >
                Archive
              </ConfirmSubmitButton>
            </form>
          )}
          <form action={deleteArticleWithId}>
            <ConfirmSubmitButton
              confirmMessage={`Permanently delete "${article.title}"? This can't be undone. Consider Archive instead.`}
              className="rounded-lg border border-red-500/30 px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
            >
              Delete
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>

      <div className="animate-slide-up grid grid-cols-1 gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm sm:grid-cols-2 sm:p-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Category</p>
          <p className="mt-0.5 text-zinc-200">{CATEGORY_LABEL[article.category] ?? article.category}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Owner</p>
          <p className="mt-0.5 text-zinc-200">{article.owner?.name ?? "Unassigned"}</p>
        </div>
        {clientName && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Client</p>
            <Link href={`/contacts/${article.clientId}`} className="mt-0.5 block text-indigo-400 hover:text-indigo-300">
              {clientName}
            </Link>
          </div>
        )}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Last updated</p>
          <p className="mt-0.5 text-zinc-200">{formatDateTime(article.updatedAt)}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Review date</p>
          <p className={`mt-0.5 ${reviewDue ? "text-amber-400" : "text-zinc-200"}`}>
            {formatDate(article.reviewDate) ?? "Not set"}
          </p>
        </div>
        {article.publishedAt && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Published</p>
            <p className="mt-0.5 text-zinc-200">{formatDateTime(article.publishedAt)}</p>
          </div>
        )}
        {article.tags && (
          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Tags</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <LabelChips labels={article.tags} />
            </div>
          </div>
        )}
        {article.summary && (
          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Summary</p>
            <p className="mt-0.5 text-zinc-300">{article.summary}</p>
          </div>
        )}
      </div>

      <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
        <ArticleContent content={article.content} />
      </div>

      {article.revisions.length > 0 && (
        <details className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
          <summary className="cursor-pointer text-sm font-medium text-zinc-300">
            Revision history ({article.revisions.length})
          </summary>
          <ul className="mt-3 space-y-2 border-t border-zinc-800 pt-3">
            {article.revisions.map((rev) => (
              <li key={rev.id} className="text-xs text-zinc-500">
                <span className="text-zinc-400">{formatDateTime(rev.createdAt)}</span>
                {rev.editedBy?.name && <span> · {rev.editedBy.name}</span>}
                <span> · &ldquo;{rev.title}&rdquo;</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
