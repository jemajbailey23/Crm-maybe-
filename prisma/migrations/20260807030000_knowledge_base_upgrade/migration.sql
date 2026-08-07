-- Knowledge Base upgrade: extend KnowledgeArticle with structured metadata,
-- add revision history, and add an AI-query audit log.
--
-- Existing KnowledgeArticle rows are preserved and backfilled with safe
-- defaults (Draft, BVD Internal, AI disabled) so nothing already written is
-- ever exposed or lost — per the spec's explicit data-preservation rule.

CREATE TYPE "KnowledgeArticleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "KnowledgeArticleVisibility" AS ENUM ('BVD_INTERNAL', 'CLIENT_PRIVATE', 'CLIENT_SHARED', 'PUBLIC');

-- New columns, all nullable or defaulted so existing rows load safely
-- before backfill.
ALTER TABLE "KnowledgeArticle"
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "summary" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "tags" TEXT,
  ADD COLUMN "status" "KnowledgeArticleStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "visibility" "KnowledgeArticleVisibility" NOT NULL DEFAULT 'BVD_INTERNAL',
  ADD COLUMN "clientId" TEXT,
  ADD COLUMN "ownerId" TEXT,
  ADD COLUMN "aiEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "reviewDate" TIMESTAMP(3),
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3);

-- Backfill slug from title for every existing row (title-derived, lowercase,
-- non-alphanumerics -> hyphens), then de-duplicate any collisions by
-- suffixing the row's short id so the later UNIQUE constraint can't fail.
UPDATE "KnowledgeArticle"
SET "slug" = lower(regexp_replace(regexp_replace(trim("title"), '[^a-zA-Z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'));

-- Suffix every duplicate with its full (already-unique) id rather than a
-- short prefix — seed/import batches can share a common cuid prefix, so a
-- short substring is not guaranteed unique on its own.
UPDATE "KnowledgeArticle" a
SET "slug" = a."slug" || '-' || a."id"
WHERE a."slug" IN (
  SELECT "slug" FROM "KnowledgeArticle" GROUP BY "slug" HAVING count(*) > 1
);

-- Guard against an empty-title edge case leaving a blank slug.
UPDATE "KnowledgeArticle" SET "slug" = 'article-' || substr("id", 1, 8) WHERE "slug" IS NULL OR "slug" = '';

ALTER TABLE "KnowledgeArticle" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "KnowledgeArticle_slug_key" ON "KnowledgeArticle"("slug");

CREATE INDEX "KnowledgeArticle_status_visibility_idx" ON "KnowledgeArticle"("status", "visibility");
CREATE INDEX "KnowledgeArticle_clientId_idx" ON "KnowledgeArticle"("clientId");
CREATE INDEX "KnowledgeArticle_category_idx" ON "KnowledgeArticle"("category");

ALTER TABLE "KnowledgeArticle"
  ADD CONSTRAINT "KnowledgeArticle_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "KnowledgeArticle_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "KnowledgeArticleRevision" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "editedById" TEXT,
  "articleId" TEXT NOT NULL,
  CONSTRAINT "KnowledgeArticleRevision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "KnowledgeArticleRevision_articleId_idx" ON "KnowledgeArticleRevision"("articleId");

ALTER TABLE "KnowledgeArticleRevision"
  ADD CONSTRAINT "KnowledgeArticleRevision_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "KnowledgeArticleRevision_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "KnowledgeArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AiQueryLog" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT,
  "clientContactId" TEXT,
  "query" TEXT NOT NULL,
  "articleIdsRetrieved" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "permissionScope" TEXT NOT NULL,
  "response" TEXT NOT NULL,
  "error" TEXT,
  CONSTRAINT "AiQueryLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiQueryLog_userId_idx" ON "AiQueryLog"("userId");
CREATE INDEX "AiQueryLog_clientContactId_idx" ON "AiQueryLog"("clientContactId");

ALTER TABLE "AiQueryLog"
  ADD CONSTRAINT "AiQueryLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "AiQueryLog_clientContactId_fkey" FOREIGN KEY ("clientContactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Postgres full-text search support for the KB search/AI-retrieval query.
-- A generated tsvector column (title weighted highest, then summary/tags,
-- then body) plus a GIN index gives ranked full-text search via
-- to_tsquery/ts_rank without any external search service.
ALTER TABLE "KnowledgeArticle" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("summary", '')), 'B') ||
    setweight(to_tsvector('english', coalesce("tags", '')), 'B') ||
    setweight(to_tsvector('english', coalesce("content", '')), 'C')
  ) STORED;

CREATE INDEX "KnowledgeArticle_searchVector_idx" ON "KnowledgeArticle" USING GIN ("searchVector");
