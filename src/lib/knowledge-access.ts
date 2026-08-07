import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// Single source of truth for Knowledge Base permission filtering. Every
// list, search, detail, and AI-retrieval query goes through one of the two
// functions below so client separation is enforced once, at the database
// query level, instead of being re-implemented (and possibly re-broken) in
// each caller.
//
// Today the CRM has exactly one authenticated role — the signed-in BVD user
// (see src/lib/auth.ts: no `role` field on User, no client-facing login).
// The "client" viewer role below has no UI entry point yet, but is real,
// callable, tested code: when a client-facing surface is added later, it
// plugs into this same permission gate rather than needing new filtering
// logic invented from scratch — and it's what lets the AI Assistant's
// client-boundary rules be verified today even though only the admin can
// drive them (via the assistant's clientName-scoped retrieval, see
// assistant/tools.ts).
export type KnowledgeViewer = { role: "bvd_admin" } | { role: "client"; clientId: string };

// Used by the KB list/search/detail pages. The BVD admin manages the whole
// knowledge base, so this intentionally does NOT filter by status/AI-flag —
// an admin must be able to see and edit Draft/Archived articles. A future
// client viewer only ever sees their own Published content.
export function articleListWhere(viewer: KnowledgeViewer): Prisma.KnowledgeArticleWhereInput {
  if (viewer.role === "bvd_admin") return {};
  return {
    status: "PUBLISHED",
    OR: [
      { visibility: "PUBLIC" },
      { visibility: { in: ["CLIENT_PRIVATE", "CLIENT_SHARED"] }, clientId: viewer.clientId },
    ],
  };
}

// Used only by the AI Assistant's retrieval tool. Always excludes Draft,
// Archived, and AI-disabled articles — "Never retrieve Draft, Archived,
// AI-disabled, or unauthorized articles" — regardless of viewer role.
//
// clientContextId is the client (Contact.id) the current question is about,
// if any (e.g. the admin asked "what's Acme's onboarding status" or is
// chatting from Acme's contact page). When set, that client's Private/
// Shared articles become eligible. When the admin asks a general question
// with no client named, client-specific Private notes are deliberately left
// out — the admin is authorized to see them, but pulling one client's
// private notes into an unrelated general answer isn't the intent of
// "appropriate client-specific" access, and keeps every answer's context
// boundary predictable and auditable.
export function aiRetrievalWhere(
  viewer: KnowledgeViewer,
  clientContextId?: string
): Prisma.KnowledgeArticleWhereInput {
  const base = { status: "PUBLISHED", aiEnabled: true } as const;

  if (viewer.role === "client") {
    // A client can retrieve only Public articles and articles explicitly
    // associated with that client — never another client's content, even
    // if a clientContextId for someone else is somehow passed in.
    return {
      ...base,
      OR: [
        { visibility: "PUBLIC" },
        { visibility: { in: ["CLIENT_PRIVATE", "CLIENT_SHARED"] }, clientId: viewer.clientId },
      ],
    };
  }

  if (clientContextId) {
    return {
      ...base,
      OR: [
        { visibility: "BVD_INTERNAL" },
        { visibility: "PUBLIC" },
        { visibility: { in: ["CLIENT_PRIVATE", "CLIENT_SHARED"] }, clientId: clientContextId },
      ],
    };
  }

  return { ...base, OR: [{ visibility: "BVD_INTERNAL" }, { visibility: "PUBLIC" }] };
}

const ARTICLE_SELECT = {
  id: true,
  title: true,
  slug: true,
  summary: true,
  content: true,
  category: true,
  visibility: true,
  clientId: true,
} satisfies Prisma.KnowledgeArticleSelect;

export type RankedArticle = Prisma.KnowledgeArticleGetPayload<{ select: typeof ARTICLE_SELECT }>;

// Full-text search using native Postgres (websearch_to_tsquery + ts_rank
// against the generated `searchVector` column, see the KB-upgrade
// migration) — no external search/vector service. Ranking is always scoped
// to a caller-supplied candidate id set (`WHERE id = ANY(candidateIds)`),
// so callers stay responsible for filtering to what the viewer is allowed
// to see (or, for the admin-facing list page, whatever UI filters apply)
// before this ever runs a search. All raw-SQL values go through Prisma's
// tagged template parameter binding — never string-concatenated.
export async function rankIdsByFullText(
  candidateIds: string[],
  query: string,
  limit: number
): Promise<string[]> {
  if (candidateIds.length === 0) return [];
  const trimmed = query.trim();
  if (!trimmed) return candidateIds.slice(0, limit);

  const ranked = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "KnowledgeArticle"
    WHERE "id" = ANY(${candidateIds})
      AND "searchVector" @@ websearch_to_tsquery('english', ${trimmed})
    ORDER BY ts_rank("searchVector", websearch_to_tsquery('english', ${trimmed})) DESC
    LIMIT ${limit}
  `;
  return ranked.map((r) => r.id);
}

export async function searchKnowledgeArticles(opts: {
  viewer: KnowledgeViewer;
  clientContextId?: string;
  forAi?: boolean;
  query?: string;
  limit?: number;
}): Promise<RankedArticle[]> {
  const { viewer, clientContextId, forAi = false, query, limit = 20 } = opts;
  const permissionWhere = forAi ? aiRetrievalWhere(viewer, clientContextId) : articleListWhere(viewer);

  const candidates = await prisma.knowledgeArticle.findMany({
    where: permissionWhere,
    select: { id: true },
  });
  const candidateIds = candidates.map((c) => c.id);
  if (candidateIds.length === 0) return [];

  const trimmedQuery = (query ?? "").trim();
  if (!trimmedQuery) {
    const rows = await prisma.knowledgeArticle.findMany({
      where: { id: { in: candidateIds } },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: ARTICLE_SELECT,
    });
    return rows;
  }

  const rankedIds = await rankIdsByFullText(candidateIds, trimmedQuery, limit);
  if (rankedIds.length === 0) return [];

  const rows = await prisma.knowledgeArticle.findMany({
    where: { id: { in: rankedIds } },
    select: ARTICLE_SELECT,
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  // Client-specific approved knowledge takes priority over general
  // guidance when a client context is set — surface those first even
  // within the relevance-ranked result set.
  const ordered = rankedIds.map((id) => byId.get(id)).filter((r): r is RankedArticle => !!r);
  if (clientContextId) {
    ordered.sort((a, b) => {
      const aMatch = a.clientId === clientContextId ? 0 : 1;
      const bMatch = b.clientId === clientContextId ? 0 : 1;
      return aMatch - bMatch;
    });
  }
  return ordered;
}

// Single-article fetch respecting the same permission gate, for the detail
// page / "open source article" links.
export async function getAuthorizedArticle(id: string, viewer: KnowledgeViewer) {
  return prisma.knowledgeArticle.findFirst({
    where: { id, ...articleListWhere(viewer) },
    include: {
      client: { select: { id: true, firstName: true, lastName: true, businessName: true } },
      owner: { select: { id: true, name: true } },
      revisions: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
}
