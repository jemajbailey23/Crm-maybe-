import Link from "next/link";

// Shared offset-based pagination for flat list pages (Contacts, Companies).
// Renders nothing when everything fits on one page, so it stays invisible
// at the CRM's current data volume and only shows up once a list actually
// needs it.
export function Pagination({
  page,
  pageSize,
  totalCount,
  basePath,
  searchParams,
}: {
  page: number;
  pageSize: number;
  totalCount: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalPages <= 1) return null;

  const hrefForPage = (p: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value);
    }
    if (p > 1) params.set("page", String(p));
    else params.delete("page");
    const query = params.toString();
    return `${basePath}${query ? `?${query}` : ""}`;
  };

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(totalCount, page * pageSize);

  return (
    <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3 text-sm">
      <p className="text-zinc-500">
        Showing <span className="text-zinc-300">{start}–{end}</span> of{" "}
        <span className="text-zinc-300">{totalCount}</span>
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link
            href={hrefForPage(page - 1)}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
          >
            Previous
          </Link>
        ) : (
          <span className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-600">
            Previous
          </span>
        )}
        <span className="px-1 text-xs text-zinc-500">
          Page {page} of {totalPages}
        </span>
        {page < totalPages ? (
          <Link
            href={hrefForPage(page + 1)}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
          >
            Next
          </Link>
        ) : (
          <span className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-600">
            Next
          </span>
        )}
      </div>
    </div>
  );
}
