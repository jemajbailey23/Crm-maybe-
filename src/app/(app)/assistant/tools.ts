import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

export const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_leads_needing_followup",
    description:
      "List leads whose next follow-up date is today or overdue. Use for questions like 'show leads needing follow-up' or 'who do I need to call back'.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_overdue_invoices",
    description:
      "List invoices that are overdue (past their due date and unpaid), including which client owes what.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_todays_summary",
    description:
      "Get an overview of today's work: new leads added today, tasks due today or overdue, and meetings scheduled today. Use for 'summarize today's work' or 'what are my priorities today'.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_client_history",
    description:
      "Look up a client or lead by name and return their full profile: business info, pipeline stage, deals, projects, services, invoices, and recent communication history. Use before drafting a proposal, follow-up email, or summarizing a client's history.",
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The client's name or business name to search for.",
        },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    name: "find_businesses_without_website",
    description:
      "List leads/clients whose business has no website on file. Useful for prospecting or outreach targeting.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_highest_value_clients",
    description:
      "List clients ranked by total value (paid invoices + won deals), highest first.",
    input_schema: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          description: "Max number of clients to return. Defaults to 10.",
        },
      },
      additionalProperties: false,
    },
  },
];

function endOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, -1);
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

async function getLeadsNeedingFollowup() {
  const leads = await prisma.contact.findMany({
    where: { status: "LEAD", nextFollowUpAt: { lte: endOfToday() } },
    orderBy: { nextFollowUpAt: "asc" },
    take: 25,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      businessName: true,
      nextFollowUpAt: true,
      pipelineStage: true,
      phone: true,
      email: true,
      leadScore: true,
    },
  });
  return { leads };
}

async function getOverdueInvoices() {
  const invoices = await prisma.invoice.findMany({
    where: {
      OR: [{ status: "OVERDUE" }, { status: "SENT", dueDate: { lt: new Date() } }],
    },
    orderBy: { dueDate: "asc" },
    take: 25,
    include: { contact: { select: { firstName: true, lastName: true, businessName: true } } },
  });
  return {
    invoices: invoices.map((i) => ({
      description: i.description,
      amount: i.amount,
      dueDate: i.dueDate,
      status: i.status,
      client: i.contact.businessName || `${i.contact.firstName} ${i.contact.lastName}`,
    })),
  };
}

async function getTodaysSummary() {
  const start = startOfToday();
  const end = endOfToday();

  const [newLeadsToday, tasksDue, meetingsToday, overdueTaskCount] = await Promise.all([
    prisma.contact.count({ where: { status: "LEAD", createdAt: { gte: start, lte: end } } }),
    prisma.task.findMany({
      where: { status: "OPEN", dueDate: { lte: end } },
      orderBy: { dueDate: "asc" },
      take: 20,
      select: { title: true, dueDate: true, priority: true },
    }),
    prisma.booking.findMany({
      where: { startsAt: { gte: start, lte: end } },
      orderBy: { startsAt: "asc" },
      select: { name: true, startsAt: true, email: true },
    }),
    prisma.task.count({ where: { status: "OPEN", dueDate: { lt: start } } }),
  ]);

  return { newLeadsToday, tasksDueOrOverdue: tasksDue, overdueTaskCount, meetingsToday };
}

async function getClientHistory(name: string) {
  const contact = await prisma.contact.findFirst({
    where: {
      OR: [
        { firstName: { contains: name, mode: "insensitive" } },
        { lastName: { contains: name, mode: "insensitive" } },
        { businessName: { contains: name, mode: "insensitive" } },
      ],
    },
    include: {
      deals: { select: { title: true, value: true, stage: true, isRecurring: true } },
      projects: { select: { name: true, status: true, progress: true, dueDate: true } },
      services: { select: { name: true, billingType: true, amount: true } },
      invoices: { select: { description: true, amount: true, status: true, dueDate: true } },
      activities: {
        orderBy: { occurredAt: "desc" },
        take: 10,
        select: { type: true, summary: true, occurredAt: true },
      },
    },
  });

  if (!contact) return { found: false, message: `No client or lead found matching "${name}".` };

  return {
    found: true,
    name: `${contact.firstName} ${contact.lastName}`,
    businessName: contact.businessName,
    status: contact.status,
    pipelineStage: contact.pipelineStage,
    contractStatus: contact.contractStatus,
    priority: contact.priority,
    email: contact.email,
    phone: contact.phone,
    address: contact.address,
    website: contact.website,
    industry: contact.industry,
    leadSource: contact.leadSource,
    currentProblems: contact.currentProblems,
    desiredOutcome: contact.desiredOutcome,
    competitors: contact.competitors,
    notes: contact.notes,
    estimatedDealValue: contact.estimatedDealValue,
    monthlyValue: contact.monthlyValue,
    nextFollowUpAt: contact.nextFollowUpAt,
    deals: contact.deals,
    projects: contact.projects,
    services: contact.services,
    invoices: contact.invoices,
    recentActivity: contact.activities,
  };
}

async function findBusinessesWithoutWebsite() {
  const contacts = await prisma.contact.findMany({
    where: {
      businessName: { not: null },
      OR: [{ website: null }, { website: "" }],
    },
    take: 25,
    select: {
      businessName: true,
      firstName: true,
      lastName: true,
      status: true,
      phone: true,
      email: true,
      industry: true,
    },
  });
  return { businesses: contacts };
}

async function getHighestValueClients(limit: number) {
  const clients = await prisma.contact.findMany({
    where: { status: "CLIENT" },
    include: {
      deals: { where: { stage: "WON" }, select: { value: true } },
      invoices: { where: { status: "PAID" }, select: { amount: true, refundedAmount: true } },
    },
  });

  const ranked = clients
    .map((c) => ({
      name: `${c.firstName} ${c.lastName}`,
      businessName: c.businessName,
      totalValue:
        c.deals.reduce((sum, d) => sum + (d.value ?? 0), 0) +
        c.invoices.reduce((sum, i) => sum + (i.amount - i.refundedAmount), 0),
    }))
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, limit || 10);

  return { clients: ranked };
}

export async function executeTool(name: string, input: Record<string, unknown>) {
  switch (name) {
    case "get_leads_needing_followup":
      return getLeadsNeedingFollowup();
    case "get_overdue_invoices":
      return getOverdueInvoices();
    case "get_todays_summary":
      return getTodaysSummary();
    case "get_client_history":
      return getClientHistory(String(input.name ?? ""));
    case "find_businesses_without_website":
      return findBusinessesWithoutWebsite();
    case "get_highest_value_clients":
      return getHighestValueClients(Number(input.limit ?? 10));
    default:
      return { error: `Unknown tool: ${name}` };
  }
}
