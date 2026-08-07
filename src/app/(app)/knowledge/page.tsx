import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { SearchBox } from "@/components/search-box";
import { EmptyState } from "@/components/ui/empty-state";
import { KnowledgeStatusBadge, KnowledgeVisibilityBadge, AiEnabledBadge, LabelChips } from "@/components/ui/badge";
import { rankIdsByFullText } from "@/lib/knowledge-access";
import { CATEGORIES, CATEGORY_LABEL } from "./categories";
import { KnowledgeFilters } from "./knowledge-filters";
import type { Prisma } from "@prisma/client";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function excerpt(text: string, length = 140) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > length ? `${flat.slice(0, length)}…` : flat;
}

const SORTS = {
  newest: { label: "Newest", orderBy: { createdAt: "desc" } as const },
  updated: { label: "Recently updated", orderBy: { updatedAt: "desc" } as const },
  title: { label: "Title (A–Z)", orderBy: { title: "asc" } as const },
  review: { label: "Review date", orderBy: { reviewDate: "asc" } as const },
};

export default async function KnowledgeBasePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    tag?: string;
    status?: string;
    visibility?: string;
    client?: string;
    ai?: string;
    sort?: string;
  }>;
}) {
  await requireUser();
  const { q, category, tag, status, visibility, client, ai, sort } = await searchParams;

  const andClauses: Prisma.KnowledgeArticleWhereInput[] = [];
  if (category) andClauses.push({ category: category as never });
  if (tag) andClauses.push({ tags: { contains: tag, mode: "insensitive" } });
  if (status) andClauses.push({ status: status as never });
  if (visibility) andClauses.push({ visibility: visibility as never });
  if (client === "none") andClauses.push({ clientId: null });
  else if (client) andClauses.push({ clientId: client });
  if (ai === "enabled") andClauses.push({ aiEnabled: true });
  else if (ai === "disabled") andClauses.push({ aiEnabled: false });

  const where: Prisma.KnowledgeArticleWhereInput = andClauses.length > 0 ? { AND: andClauses } : {};
  const sortKey = sort && sort in SORTS ? (sort as keyof typeof SORTS) : "updated";

  const [filteredIds, counts, clients] = await Promise.all([
    prisma.knowledgeArticle.findMany({ where, select: { id: true } }),
    prisma.knowledgeArticle.groupBy({ by: ["category"], _count: { _all: true } }),
    prisma.contact.findMany({
      where: { status: "CLIENT" },
      orderBy: [{ businessName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true, businessName: true },
    }),
  ]);

  let candidateIds = filteredIds.map((a) => a.id);
  if (q?.trim()) {
    // Full-text search (title/summary/content/category/tags all feed the
    // generated searchVector) scoped to whatever the other filters already
    // narrowed down to.
    candidateIds = await rankIdsByFullText(candidateIds, q.trim(), 200);
  }

  const articles =
    candidateIds.length === 0
      ? []
      : await prisma.knowledgeArticle.findMany({
          where: { id: { in: candidateIds } },
          orderBy: SORTS[sortKey].orderBy,
          include: {
            client: { select: { id: true, firstName: true, lastName: true, businessName: true } },
            owner: { select: { id: true, name: true } },
          },
        });

  // Full-text search re-orders by relevance server-side (via candidateIds),
  // but the display `orderBy` above (e.g. "Title A-Z") would re-sort it —
  // so when a search query with the default relevance sort is active, keep
  // the ranked order instead of re-applying the DB orderBy.
  const sortedArticles =
    q?.trim() && sortKey === "updated"
      ? candidateIds.map((id) => articles.find((a) => a.id === id)).filter((a): a is (typeof articles)[number] => !!a)
      : articles;

  const countByCategory = Object.fromEntries(counts.map((c) => [c.category, c._count._all]));
  const totalCount = counts.reduce((sum, c) => sum + c._count._all, 0);
  const now = new Date();

  const clientOptions = clients.map((c) => ({
    id: c.id,
    label: c.businessName || `${c.firstName} ${c.lastName}`,
  }));

  const hasAnyFilter = !!(q || category || tag || status || visibility || client || ai);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Knowledge base</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {totalCount} {totalCount === 1 ? "article" : "articles"} · Scripts, SOPs, templates, and answers
            your team — and the AI Assistant — can search.
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
        <SearchBox key={q ?? ""} placeholder="Search title, summary, content, category, tags…" />
      </Suspense>

      <Suspense>
        <KnowledgeFilters clients={clientOptions} sorts={Object.entries(SORTS).map(([value, s]) => ({ value, label: s.label }))} />
      </Suspense>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[14rem_1fr]">
        <nav className="animate-slide-up space-y-0.5 rounded-xl border border-zinc-800 bg-zinc-900/50 p-2 md:sticky md:top-6 md:self-start">
          <Link
            href={q ? `/knowledge?q=${encodeURIComponent(q)}` : "/knowledge"}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
              !category ? "bg-indigo-500/10 text-indigo-300" : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
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
              <span className="text-xs text-zinc-500">{countByCategory[c.value] ?? 0}</span>
            </Link>
          ))}
        </nav>

        <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-2">
          {sortedArticles.length === 0 ? (
            <div className="px-4 py-10">
              <EmptyState
                message={
                  hasAnyFilter
                    ? "No articles match these filters."
                    : "No articles yet. Start building your knowledge base."
                }
                actionLabel={hasAnyFilter ? undefined : "Create the first article"}
                actionHref={hasAnyFilter ? undefined : "/knowledge/new"}
              />
            </div>
          ) : (
            <ul className="divide-y divide-zinc-800/60">
              {sortedArticles.map((article) => {
                const clientName = article.client
                  ? article.client.businessName || `${article.client.firstName} ${article.client.lastName}`
                  : null;
                const reviewDue = article.reviewDate && article.reviewDate <= now;
                return (
                  <li key={article.id}>
                    <Link
                      href={`/knowledge/${article.id}`}
                      className="block rounded-lg px-3 py-3 transition-colors hover:bg-zinc-800/40"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-zinc-100">{article.title}</p>
                        <span className="shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                          {CATEGORY_LABEL[article.category] ?? article.category}
                        </span>
                      </div>
                      {article.summary && <p className="mt-1 text-sm text-zinc-500">{excerpt(article.summary)}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <KnowledgeStatusBadge status={article.status} />
                        <KnowledgeVisibilityBadge visibility={article.visibility} />
                        <AiEnabledBadge enabled={article.aiEnabled} />
                        {clientName && (
                          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                            {clientName}
                          </span>
                        )}
                        {reviewDue && (
                          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400 ring-1 ring-inset ring-amber-500/20">
                            Review due
                          </span>
                        )}
                        <LabelChips labels={article.tags} />
                      </div>
                      <p className="mt-1.5 text-xs text-zinc-600">
                        {article.owner?.name ? `${article.owner.name} · ` : ""}Updated {formatDate(article.updatedAt)}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
