"use server";

import { prisma } from "@/lib/prisma";
import { CATEGORY_LABEL } from "./knowledge/categories";

export type SearchResult = {
  id: string;
  type: "contact" | "company" | "deal" | "task" | "project" | "article";
  title: string;
  subtitle?: string;
  href: string;
};

export async function globalSearch(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const [contacts, companies, deals, tasks, projects, articles] = await Promise.all([
    prisma.contact.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { businessName: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
    }),
    prisma.company.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      take: 5,
    }),
    prisma.deal.findMany({
      where: { title: { contains: q, mode: "insensitive" } },
      take: 5,
    }),
    prisma.task.findMany({
      where: { title: { contains: q, mode: "insensitive" } },
      take: 5,
    }),
    prisma.project.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      include: { contact: true },
      take: 5,
    }),
    prisma.knowledgeArticle.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { content: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
    }),
  ]);

  return [
    ...contacts.map((c) => ({
      id: c.id,
      type: "contact" as const,
      title: `${c.firstName} ${c.lastName}`,
      subtitle: c.email ?? "Contact",
      href: `/contacts/${c.id}`,
    })),
    ...companies.map((c) => ({
      id: c.id,
      type: "company" as const,
      title: c.name,
      subtitle: c.website ?? "Company",
      href: `/companies/${c.id}`,
    })),
    ...deals.map((d) => ({
      id: d.id,
      type: "deal" as const,
      title: d.title,
      subtitle: d.stage.charAt(0) + d.stage.slice(1).toLowerCase(),
      href: `/deals/${d.id}`,
    })),
    ...tasks.map((t) => ({
      id: t.id,
      type: "task" as const,
      title: t.title,
      subtitle: t.status === "DONE" ? "Done" : "Open",
      href: `/tasks/${t.id}`,
    })),
    ...projects.map((p) => ({
      id: p.id,
      type: "project" as const,
      title: p.name,
      subtitle: p.contact.businessName || `${p.contact.firstName} ${p.contact.lastName}`,
      href: `/projects/${p.id}`,
    })),
    ...articles.map((a) => ({
      id: a.id,
      type: "article" as const,
      title: a.title,
      subtitle: CATEGORY_LABEL[a.category] ?? a.category,
      href: `/knowledge/${a.id}`,
    })),
  ];
}
