import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { rowsToCsv, csvResponse } from "@/lib/csv";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  await requireUser();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const status = searchParams.get("status");
  const idsParam = searchParams.get("ids");

  let where: Prisma.ContactWhereInput;
  if (idsParam) {
    const ids = idsParam.split(",").filter(Boolean);
    where = { id: { in: ids } };
  } else {
    where = {
      ...(status === "LEAD" || status === "CLIENT" ? { status } : {}),
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" as const } },
              { lastName: { contains: q, mode: "insensitive" as const } },
              { email: { contains: q, mode: "insensitive" as const } },
              { phone: { contains: q, mode: "insensitive" as const } },
              { company: { name: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };
  }

  const contacts = await prisma.contact.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { company: true },
  });

  const headers = [
    "First name",
    "Last name",
    "Business name",
    "Company",
    "Email",
    "Phone",
    "Status",
    "Pipeline stage",
    "Priority",
    "Lead source",
    "Estimated deal value",
    "Monthly value",
    "Industry",
    "Website",
    "Address",
    "Next follow-up",
    "Created",
  ];

  const rows = contacts.map((c) => [
    c.firstName,
    c.lastName,
    c.businessName,
    c.company?.name,
    c.email,
    c.phone,
    c.status,
    c.pipelineStage,
    c.priority,
    c.leadSource,
    c.estimatedDealValue,
    c.monthlyValue,
    c.industry,
    c.website,
    c.address,
    c.nextFollowUpAt ? c.nextFollowUpAt.toISOString().slice(0, 10) : "",
    c.createdAt.toISOString().slice(0, 10),
  ]);

  return csvResponse(rowsToCsv(headers, rows), "contacts");
}
