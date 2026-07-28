import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ArticleForm } from "../article-form";
import { updateArticle, deleteArticle } from "../actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { CopyLinkButton } from "@/components/copy-link-button";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const article = await prisma.knowledgeArticle.findUnique({ where: { id } });
  if (!article) notFound();

  const updateArticleWithId = updateArticle.bind(null, article.id);
  const deleteArticleWithId = deleteArticle.bind(null, article.id);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            {article.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Last updated {formatDate(article.updatedAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CopyLinkButton text={article.content} label="Copy content" />
          <form action={deleteArticleWithId}>
            <ConfirmSubmitButton
              confirmMessage={`Delete "${article.title}"? This can't be undone.`}
              className="rounded-lg border border-red-500/30 px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
            >
              Delete
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>

      <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <ArticleForm
          action={updateArticleWithId}
          defaultValues={article}
          submitLabel="Save changes"
        />
      </div>
    </div>
  );
}
