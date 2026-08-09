import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { searchKnowledgeArticles, type KnowledgeViewer } from "@/lib/knowledge-access";

export const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_knowledge_base",
    description:
      "Search Bailey Ventures Digital's internal knowledge base (sales scripts, discovery questions, SOPs, proposal/email templates, prompt library, objection handling, business resources) for approved, published, AI-enabled articles relevant to the question. Always try this before answering from general knowledge when the question could be covered by company policy, a script, an SOP, or a template. Only authorized articles the system has already permission-filtered are ever returned — never invent article content beyond what's returned.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The topic or question to search for, e.g. 'cold call opener' or 'refund policy'.",
        },
        clientName: {
          type: "string",
          description:
            "Name or business name of the specific client this question is about, if any. Set this whenever the conversation concerns one client, so that client's approved client-specific articles (and only that client's) are considered — never guess or reuse a different client's name.",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
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
      where: { status: { notIn: ["COMPLETED", "CANCELLED"] }, dueDate: { lte: end } },
      orderBy: { dueDate: "asc" },
      take: 20,
      select: { title: true, dueDate: true, priority: true },
    }),
    prisma.booking.findMany({
      where: { startsAt: { gte: start, lte: end } },
      orderBy: { startsAt: "asc" },
      select: { name: true, startsAt: true, email: true },
    }),
    prisma.task.count({
      where: { status: { notIn: ["COMPLETED", "CANCELLED"] }, dueDate: { lt: start } },
    }),
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
      deals: { select: { title: true, oneTimeValue: true, mrrValue: true, stage: true } },
      projects: { select: { name: true, status: true, progress: true, targetCompletionDate: true } },
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

export type KnowledgeSearchOutcome = {
  found: boolean;
  message?: string;
  clientContext?: string | null;
  clientContextId?: string | null;
  articles?: { id: string; title: string; summary: string; category: string; content: string }[];
};

async function searchKnowledgeBase(
  query: string,
  clientName: string | undefined,
  viewer: KnowledgeViewer
): Promise<KnowledgeSearchOutcome> {
  let clientContextId: string | undefined;
  let clientContextName: string | undefined;

  if (clientName?.trim()) {
    const client = await prisma.contact.findFirst({
      where: {
        status: "CLIENT",
        OR: [
          { firstName: { contains: clientName, mode: "insensitive" } },
          { lastName: { contains: clientName, mode: "insensitive" } },
          { businessName: { contains: clientName, mode: "insensitive" } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, businessName: true },
    });
    if (client) {
      clientContextId = client.id;
      clientContextName = client.businessName || `${client.firstName} ${client.lastName}`;
    }
  }

  const articles = await searchKnowledgeArticles({
    viewer,
    clientContextId,
    forAi: true,
    query,
    limit: 5,
  });

  if (articles.length === 0) {
    return {
      found: false,
      clientContext: clientContextName ?? null,
      clientContextId: clientContextId ?? null,
      message:
        "No approved, Published, AI-enabled knowledge article matched this query" +
        (clientContextName ? ` for ${clientContextName}` : "") +
        ". Do not invent an answer — tell the user no approved knowledge covers this and suggest a human review or that an article be added.",
    };
  }

  return {
    found: true,
    clientContext: clientContextName ?? null,
    clientContextId: clientContextId ?? null,
    articles: articles.map((a) => ({
      id: a.id,
      title: a.title,
      summary: a.summary,
      category: a.category,
      content: a.content,
    })),
  };
}

async function getHighestValueClients(limit: number) {
  const clients = await prisma.contact.findMany({
    where: { status: "CLIENT" },
    include: {
      deals: { where: { stage: "WON" }, select: { oneTimeValue: true, mrrValue: true } },
      invoices: { where: { status: "PAID" }, select: { amount: true, refundedAmount: true } },
    },
  });

  const ranked = clients
    .map((c) => ({
      name: `${c.firstName} ${c.lastName}`,
      businessName: c.businessName,
      totalValue:
        c.deals.reduce((sum, d) => sum + (d.oneTimeValue ?? 0) + (d.mrrValue ?? 0), 0) +
        c.invoices.reduce((sum, i) => sum + (i.amount - i.refundedAmount), 0),
    }))
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, limit || 10);

  return { clients: ranked };
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: { viewer: KnowledgeViewer }
) {
  switch (name) {
    case "search_knowledge_base":
      return searchKnowledgeBase(
        String(input.query ?? ""),
        input.clientName ? String(input.clientName) : undefined,
        ctx.viewer
      );
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
