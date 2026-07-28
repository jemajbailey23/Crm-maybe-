import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SearchBox } from "@/components/search-box";
import { CATEGORIES, CATEGORY_LABEL } from "./categories";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function excerpt(content: string, length = 140) {
  const flat = content.replace(/\s+/g, " ").trim();
  return flat.length > length ? `${flat.slice(0, length)}…` : flat;
}

export default async function KnowledgeBasePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;

  const [articles, counts] = await Promise.all([
    prisma.knowledgeArticle.findMany({
      where: {
        AND: [
          category ? { category: category as never } : {},
          q
            ? {
                OR: [
                  { title: { contains: q, mode: "insensitive" } },
                  { content: { contains: q, mode: "insensitive" } },
                ],
              }
            : {},
        ],
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.knowledgeArticle.groupBy({
      by: ["category"],
      _count: { _all: true },
    }),
  ]);

  const countByCategory = Object.fromEntries(
    counts.map((c) => [c.category, c._count._all])
  );
  const totalCount = counts.reduce((sum, c) => sum + c._count._all, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            Knowledge base
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Scripts, SOPs, templates, and answers your whole team can search.
          </p>
        </div>
        <Link
          href="/knowledge/new"
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400"
        >
          New article
        </Link>
      </div>

      <Suspense>
        <SearchBox key={q ?? ""} placeholder="Search the knowledge base…" />
      </Suspense>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[14rem_1fr]">
        <nav className="animate-slide-up space-y-0.5 rounded-xl border border-zinc-800 bg-zinc-900/50 p-2 md:sticky md:top-6 md:self-start">
          <Link
            href={q ? `/knowledge?q=${encodeURIComponent(q)}` : "/knowledge"}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
              !category
                ? "bg-indigo-500/10 text-indigo-300"
                : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
            }`}
          >
            All articles
            <span className="text-xs text-zinc-500">{totalCount}</span>
          </Link>
          {CATEGORIES.map((c) => (
            <Link
              key={c.value}
              href={`/knowledge?category=${c.value}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                category === c.value
                  ? "bg-indigo-500/10 text-indigo-300"
                  : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
              }`}
            >
              {c.label}
              <span className="text-xs text-zinc-500">
                {countByCategory[c.value] ?? 0}
              </span>
            </Link>
          ))}
        </nav>

        <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-2">
          {articles.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-500">
              {q || category
                ? "No articles match this filter."
                : "No articles yet. Start building your knowledge base."}
            </p>
          ) : (
            <ul className="divide-y divide-zinc-800/60">
              {articles.map((article) => (
                <li key={article.id}>
                  <Link
                    href={`/knowledge/${article.id}`}
                    className="block rounded-lg px-3 py-3 transition-colors hover:bg-zinc-800/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-zinc-100">{article.title}</p>
                      <span className="shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                        {CATEGORY_LABEL[article.category] ?? article.category}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-zinc-500">
                      {excerpt(article.content)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-600">
                      Updated {formatDate(article.updatedAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
