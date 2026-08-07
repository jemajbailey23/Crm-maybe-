-- Let knowledge articles carry file attachments, reusing the existing
-- Attachment model/storage pattern already used by contacts/projects/tasks.

ALTER TABLE "Attachment" ADD COLUMN "articleId" TEXT;

ALTER TABLE "Attachment"
  ADD CONSTRAINT "Attachment_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "KnowledgeArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
