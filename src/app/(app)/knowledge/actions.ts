"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  KnowledgeCategory,
  KnowledgeArticleStatus,
  KnowledgeArticleVisibility,
} from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { uniqueArticleSlug } from "@/lib/slug";
import { CATEGORIES } from "./categories";

export type ArticleFormState = { error?: string; savedAt?: string };

const CATEGORY_VALUES = CATEGORIES.map((c) => c.value);
const VISIBILITY_VALUES = Object.values(KnowledgeArticleVisibility);
const STATUS_VALUES = Object.values(KnowledgeArticleStatus);
const CLIENT_SCOPED_VISIBILITIES = new Set(["CLIENT_PRIVATE", "CLIENT_SHARED"]);

function str(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function date(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

type ParsedFields = {
  title: string;
  summary: string;
  content: string;
  category: KnowledgeCategory;
  tags: string | null;
  visibility: KnowledgeArticleVisibility;
  clientId: string | null;
  ownerId: string | null;
  aiEnabled: boolean;
  reviewDate: Date | null;
};

// Server-side parsing + the clientId/visibility rule enforcement — the
// frontend hides the Client selector for non-client visibilities, but that
// alone is not trusted: a request that skips the UI entirely (or a stale
// form) still gets clientId forced to null here whenever visibility doesn't
// require one, and visibility itself is validated against the real enum.
function parseArticleFields(formData: FormData): ParsedFields {
  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const categoryRaw = String(formData.get("category") ?? "").trim();
  const tags = str(formData, "tags");
  const visibilityRaw = String(formData.get("visibility") ?? "").trim();
  const clientIdRaw = str(formData, "clientId");
  const ownerId = str(formData, "ownerId");
  const aiEnabled = formData.get("aiEnabled") === "on";
  const reviewDate = date(formData, "reviewDate");

  const visibility = VISIBILITY_VALUES.includes(visibilityRaw as KnowledgeArticleVisibility)
    ? (visibilityRaw as KnowledgeArticleVisibility)
    : KnowledgeArticleVisibility.BVD_INTERNAL;

  const clientId = CLIENT_SCOPED_VISIBILITIES.has(visibility) ? clientIdRaw : null;

  return {
    title,
    summary,
    content,
    category: CATEGORY_VALUES.includes(categoryRaw)
      ? (categoryRaw as KnowledgeCategory)
      : KnowledgeCategory.BUSINESS_RESOURCES,
    tags,
    visibility,
    clientId,
    ownerId,
    aiEnabled,
    reviewDate,
  };
}

function validate(fields: ParsedFields): string | null {
  if (!fields.title) return "Title is required.";
  if (fields.title.length > 200) return "Title must be 200 characters or fewer.";
  if (!fields.content) return "Article content can't be empty.";
  if (CLIENT_SCOPED_VISIBILITIES.has(fields.visibility) && !fields.clientId) {
    return "Select a client for Client Private or Client Shared visibility.";
  }
  return null;
}

async function assertClientExists(clientId: string | null) {
  if (!clientId) return;
  const client = await prisma.contact.findUnique({ where: { id: clientId }, select: { id: true } });
  if (!client) throw new Error("Selected client no longer exists.");
}

function resolveStatus(
  formData: FormData,
  fallback: KnowledgeArticleStatus
): KnowledgeArticleStatus {
  // The Save Draft / Publish Article buttons carry an explicit intent and
  // always win — they're the spec's named primary actions. The Status
  // field is otherwise respected (e.g. moving a Published article back to
  // Draft, or Archiving from the form) when neither of those buttons was
  // the one clicked.
  const intent = String(formData.get("intent") ?? "");
  if (intent === "draft") return "DRAFT";
  if (intent === "publish") return "PUBLISHED";
  const statusRaw = String(formData.get("status") ?? "");
  return STATUS_VALUES.includes(statusRaw as KnowledgeArticleStatus)
    ? (statusRaw as KnowledgeArticleStatus)
    : fallback;
}

export async function createArticle(
  _prevState: ArticleFormState,
  formData: FormData
): Promise<ArticleFormState> {
  const user = await requireUser();
  const fields = parseArticleFields(formData);
  const error = validate(fields);
  if (error) return { error };

  try {
    await assertClientExists(fields.clientId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Invalid client." };
  }

  const status = resolveStatus(formData, "DRAFT");
  const slug = await uniqueArticleSlug(fields.title);
  const now = new Date();

  const article = await prisma.knowledgeArticle.create({
    data: {
      title: fields.title,
      summary: fields.summary,
      content: fields.content,
      category: fields.category,
      tags: fields.tags,
      visibility: fields.visibility,
      clientId: fields.clientId,
      ownerId: fields.ownerId ?? user.id,
      aiEnabled: fields.aiEnabled,
      reviewDate: fields.reviewDate,
      slug,
      status,
      publishedAt: status === "PUBLISHED" ? now : null,
    },
  });

  revalidatePath("/knowledge");
  redirect(`/knowledge/${article.id}`);
}

export async function updateArticle(
  articleId: string,
  _prevState: ArticleFormState,
  formData: FormData
): Promise<ArticleFormState> {
  const user = await requireUser();
  const fields = parseArticleFields(formData);
  const error = validate(fields);
  if (error) return { error };

  try {
    await assertClientExists(fields.clientId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Invalid client." };
  }

  const existing = await prisma.knowledgeArticle.findUnique({ where: { id: articleId } });
  if (!existing) return { error: "Article not found." };

  // Snapshot the pre-edit content as a revision whenever title/summary/
  // content meaningfully changed — lightweight version history without a
  // separate diffing/restore UI.
  const contentChanged =
    existing.title !== fields.title ||
    existing.summary !== fields.summary ||
    existing.content !== fields.content;
  if (contentChanged) {
    await prisma.knowledgeArticleRevision.create({
      data: {
        articleId,
        title: existing.title,
        summary: existing.summary,
        content: existing.content,
        editedById: user.id,
      },
    });
  }

  const status = resolveStatus(formData, existing.status);
  const now = new Date();
  const intent = String(formData.get("intent") ?? "");

  await prisma.knowledgeArticle.update({
    where: { id: articleId },
    data: {
      title: fields.title,
      summary: fields.summary,
      content: fields.content,
      category: fields.category,
      tags: fields.tags,
      visibility: fields.visibility,
      clientId: fields.clientId,
      ownerId: fields.ownerId,
      aiEnabled: fields.aiEnabled,
      reviewDate: fields.reviewDate,
      status,
      publishedAt: status === "PUBLISHED" ? (existing.publishedAt ?? now) : existing.publishedAt,
      archivedAt: status === "ARCHIVED" ? now : status !== existing.status ? null : existing.archivedAt,
    },
  });

  revalidatePath("/knowledge");
  revalidatePath(`/knowledge/${articleId}`);
  if (intent === "publish") redirect(`/knowledge/${articleId}`);
  return { savedAt: now.toISOString() };
}

// Lightweight background save used only while editing an existing Draft —
// updates just the editable content fields, never changes status, and
// never fires for a Published/Archived article (guarded below), so it can
// never silently republish or unarchive something.
export async function autosaveArticleDraft(
  articleId: string,
  data: {
    title: string;
    summary: string;
    content: string;
    tags: string | null;
    category: string;
    visibility: string;
    clientId: string | null;
    aiEnabled: boolean;
    reviewDate: string | null;
  }
): Promise<{ savedAt?: string; error?: string }> {
  await requireUser();
  const existing = await prisma.knowledgeArticle.findUnique({
    where: { id: articleId },
    select: { status: true },
  });
  if (!existing || existing.status !== "DRAFT") return {};
  if (!data.title.trim()) return {}; // don't autosave an emptied-out title

  const visibility = VISIBILITY_VALUES.includes(data.visibility as KnowledgeArticleVisibility)
    ? (data.visibility as KnowledgeArticleVisibility)
    : KnowledgeArticleVisibility.BVD_INTERNAL;
  const clientId = CLIENT_SCOPED_VISIBILITIES.has(visibility) ? data.clientId : null;
  const category = CATEGORY_VALUES.includes(data.category)
    ? (data.category as KnowledgeCategory)
    : KnowledgeCategory.BUSINESS_RESOURCES;

  try {
    await assertClientExists(clientId);
  } catch {
    return {}; // silently skip a bad in-progress client selection; next real save will validate
  }

  const reviewDate = data.reviewDate ? new Date(data.reviewDate) : null;

  await prisma.knowledgeArticle.update({
    where: { id: articleId },
    data: {
      title: data.title.trim(),
      summary: data.summary.trim(),
      content: data.content,
      tags: data.tags,
      category,
      visibility,
      clientId,
      aiEnabled: data.aiEnabled,
      reviewDate: reviewDate && !Number.isNaN(reviewDate.getTime()) ? reviewDate : null,
    },
  });

  revalidatePath("/knowledge");
  return { savedAt: new Date().toISOString() };
}

export async function archiveArticle(articleId: string) {
  await requireUser();
  await prisma.knowledgeArticle.update({
    where: { id: articleId },
    data: { status: "ARCHIVED", archivedAt: new Date() },
  });
  revalidatePath("/knowledge");
  revalidatePath(`/knowledge/${articleId}`);
}

export async function duplicateArticle(articleId: string) {
  const user = await requireUser();
  const original = await prisma.knowledgeArticle.findUnique({ where: { id: articleId } });
  if (!original) throw new Error("Article not found.");

  const title = `${original.title} (Copy)`;
  const slug = await uniqueArticleSlug(title);

  const copy = await prisma.knowledgeArticle.create({
    data: {
      title,
      slug,
      summary: original.summary,
      content: original.content,
      category: original.category,
      tags: original.tags,
      visibility: original.visibility,
      clientId: original.clientId,
      ownerId: user.id,
      // Duplicates always require a fresh review before the AI can use
      // them, even if the original was AI-enabled.
      aiEnabled: false,
      reviewDate: original.reviewDate,
      status: "DRAFT",
    },
  });

  revalidatePath("/knowledge");
  redirect(`/knowledge/${copy.id}/edit`);
}

export async function deleteArticle(articleId: string) {
  await requireUser();
  await prisma.knowledgeArticle.delete({ where: { id: articleId } });
  revalidatePath("/knowledge");
  redirect("/knowledge");
}
