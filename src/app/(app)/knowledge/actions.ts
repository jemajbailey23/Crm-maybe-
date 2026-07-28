"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { KnowledgeCategory } from "@prisma/client";
import { CATEGORIES } from "./categories";

export type ArticleFormState = { error?: string };

const CATEGORY_VALUES = CATEGORIES.map((c) => c.value);

function parseArticleFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const categoryRaw = String(formData.get("category") ?? "").trim();

  return {
    title,
    content,
    category: CATEGORY_VALUES.includes(categoryRaw)
      ? (categoryRaw as KnowledgeCategory)
      : KnowledgeCategory.BUSINESS_RESOURCES,
  };
}

export async function createArticle(
  _prevState: ArticleFormState,
  formData: FormData
): Promise<ArticleFormState> {
  const fields = parseArticleFields(formData);
  if (!fields.title) return { error: "Title is required." };
  if (!fields.content) return { error: "Content can't be empty." };

  const article = await prisma.knowledgeArticle.create({ data: fields });
  revalidatePath("/knowledge");
  redirect(`/knowledge/${article.id}`);
}

export async function updateArticle(
  articleId: string,
  _prevState: ArticleFormState,
  formData: FormData
): Promise<ArticleFormState> {
  const fields = parseArticleFields(formData);
  if (!fields.title) return { error: "Title is required." };
  if (!fields.content) return { error: "Content can't be empty." };

  await prisma.knowledgeArticle.update({ where: { id: articleId }, data: fields });
  revalidatePath("/knowledge");
  revalidatePath(`/knowledge/${articleId}`);
  return {};
}

export async function deleteArticle(articleId: string) {
  await prisma.knowledgeArticle.delete({ where: { id: articleId } });
  revalidatePath("/knowledge");
  redirect("/knowledge");
}
