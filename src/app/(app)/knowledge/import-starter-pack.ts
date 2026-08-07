"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { uniqueArticleSlug } from "@/lib/slug";
import { STARTER_PACK } from "./starter-pack-data";

export type ImportResult = { created: number; skipped: number; error?: string };

// Imports the bundled BVD starter-pack articles as Draft / BVD Internal /
// AI-disabled — never auto-published, never AI-enabled, per the spec's
// "do not auto-publish imported articles" rule. Safe to click more than
// once: any starter-pack title that already exists in the knowledge base
// (from a previous import, or because someone already created one with the
// same title) is skipped rather than duplicated.
export async function importStarterPack(): Promise<ImportResult> {
  const user = await requireUser();

  const existing = await prisma.knowledgeArticle.findMany({
    where: { title: { in: STARTER_PACK.map((a) => a.title) } },
    select: { title: true },
  });
  const existingTitles = new Set(existing.map((a) => a.title));

  let created = 0;
  let skipped = 0;

  for (const article of STARTER_PACK) {
    if (existingTitles.has(article.title)) {
      skipped++;
      continue;
    }
    const slug = await uniqueArticleSlug(article.title);
    await prisma.knowledgeArticle.create({
      data: {
        title: article.title,
        slug,
        summary: article.summary,
        content: article.content,
        category: article.category,
        tags: article.tags,
        status: "DRAFT",
        visibility: "BVD_INTERNAL",
        clientId: null,
        ownerId: user.id,
        aiEnabled: false,
      },
    });
    created++;
  }

  revalidatePath("/knowledge");
  return { created, skipped };
}
