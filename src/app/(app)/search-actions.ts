"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { CATEGORY_LABEL } from "./knowledge/categories";

export type SearchResult = {
  id: string;
  type: "contact" | "company" | "deal" | "task" | "project" | "article" | "invoice" | "booking";
  title: string;
  subtitle?: string;
  href: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function contactDisplayName(c: { firstName: string; lastName: string; businessName: string | null }) {
  return c.businessName || `${c.firstName} ${c.lastName}`;
}

function invoiceStatusLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function formatBookingTime(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(date);
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const user = await requireUser();

  // Lets "$2,400" or "2400" match an invoice by its amount, on top of the
  // usual text search on its description.
  const numericQuery = Number(q.replace(/[^0-9.]/g, ""));
  const hasNumericQuery = q.replace(/[^0-9.]/g, "").length > 0 && !Number.isNaN(numericQuery);

  const [contacts, companies, deals, tasks, projects, articles, invoices, bookings] = await Promise.all([
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
    prisma.invoice.findMany({
      where: {
        OR: [
          { description: { contains: q, mode: "insensitive" } },
          ...(hasNumericQuery ? [{ amount: numericQuery }] : []),
        ],
      },
      include: { contact: true },
      take: 5,
    }),
    prisma.booking.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
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
      subtitle: t.status.charAt(0) + t.status.slice(1).toLowerCase().replace("_", " "),
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
    ...invoices.map((i) => ({
      id: i.id,
      type: "invoice" as const,
      title: i.description,
      subtitle: `${formatCurrency(i.amount)} · ${invoiceStatusLabel(i.status)} · ${contactDisplayName(i.contact)}`,
      // Invoices are managed inline on the contact's Billing tab — there's
      // no standalone invoice page to link to.
      href: `/contacts/${i.contactId}?tab=billing`,
    })),
    ...bookings.map((b) => ({
      id: b.id,
      type: "booking" as const,
      title: b.name,
      subtitle: `${formatBookingTime(b.startsAt, user.bookingTimezone)} · ${b.email}`,
      // Same story as invoices — bookings are managed on the one Booking
      // list page, not a per-booking URL.
      href: "/booking",
    })),
  ];
}
