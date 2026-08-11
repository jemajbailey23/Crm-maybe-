import "server-only";
import { prisma } from "@/lib/prisma";

export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "article";
}

// Appends -2, -3, ... until the slug is free. Pass excludeId when
// regenerating a slug for an existing article so it doesn't collide with
// itself.
export async function uniqueArticleSlug(title: string, excludeId?: string): Promise<string> {
  const base = slugify(title);
  let candidate = base;
  let n = 2;
  // Bounded loop — title collisions are rare and this is admin-only input,
  // but avoid any possibility of looping forever.
  while (n < 1000) {
    const existing = await prisma.knowledgeArticle.findFirst({
      where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${base}-${n}`;
    n++;
  }
  return `${base}-${Date.now()}`;
}

// Same pattern for MeetingType slugs, which power the public /book/[slug]
// share links.
export async function uniqueMeetingTypeSlug(name: string, excludeId?: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let n = 2;
  while (n < 1000) {
    const existing = await prisma.meetingType.findFirst({
      where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${base}-${n}`;
    n++;
  }
  return `${base}-${Date.now()}`;
}
