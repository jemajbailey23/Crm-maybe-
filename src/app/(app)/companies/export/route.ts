import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { rowsToCsv, csvResponse } from "@/lib/csv";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  await requireUser();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const idsParam = searchParams.get("ids");

  let where: Prisma.CompanyWhereInput;
  if (idsParam) {
    where = { id: { in: idsParam.split(",").filter(Boolean) } };
  } else {
    where = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { website: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {};
  }

  const companies = await prisma.company.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { contacts: true, deals: true } } },
  });

  const headers = ["Name", "Website", "Phone", "Contacts", "Deals", "Notes", "Created"];
  const rows = companies.map((c) => [
    c.name,
    c.website,
    c.phone,
    c._count.contacts,
    c._count.deals,
    c.notes,
    c.createdAt.toISOString().slice(0, 10),
  ]);

  return csvResponse(rowsToCsv(headers, rows), "companies");
}
