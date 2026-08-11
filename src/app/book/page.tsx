import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

// Meeting-type list depends on live data — never prerender at build time.
export const dynamic = "force-dynamic";

export default async function BookLandingPage() {
  const types = await prisma.meetingType.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  // Preserves the original single-flow booking page design: with only one
  // active meeting type, skip straight to it instead of making a visitor
  // choose from a list of one.
  if (types.length === 1) {
    redirect(`/book/${types[0].slug}`);
  }

  return (
    <div className="flex flex-1 justify-center px-4 py-12">
      <div className="animate-slide-up w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/20">
            BV
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            Book time with us
          </h1>
          <p className="mt-1 text-sm text-zinc-500">Bailey Ventures Digital</p>
        </div>

        {types.length === 0 ? (
          <p className="text-center text-sm text-zinc-500">
            No meeting types are available right now — check back soon.
          </p>
        ) : (
          <div className="space-y-3">
            {types.map((type) => (
              <Link
                key={type.id}
                href={`/book/${type.slug}`}
                className="block rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-indigo-500/40 hover:bg-zinc-900"
              >
                <p className="font-medium text-zinc-100">{type.name}</p>
                {type.description && <p className="mt-1 text-sm text-zinc-500">{type.description}</p>}
                <p className="mt-2 text-xs text-zinc-600">{type.durationMinutes} min</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
