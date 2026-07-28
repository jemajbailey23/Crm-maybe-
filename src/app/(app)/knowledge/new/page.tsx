import { ArticleForm } from "../article-form";
import { createArticle } from "../actions";

export default async function NewArticlePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">New article</h1>
        <p className="mt-1 text-sm text-zinc-500">Add a new entry to the knowledge base.</p>
      </div>
      <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <ArticleForm
          action={createArticle}
          defaultValues={category ? { category } : undefined}
          submitLabel="Create article"
        />
      </div>
    </div>
  );
}
