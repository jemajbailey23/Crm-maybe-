import { renderMarkdownToSafeHtml } from "@/lib/markdown";

// Shared rendering classes for parsed article markdown — used by both the
// edit-form preview pane and the read-only article detail view, so the two
// never visually drift from each other. Tailwind arbitrary-variant
// selectors stand in for a typography plugin (none is installed) since the
// HTML is produced by our own fixed-tag renderer (see lib/markdown.ts),
// not raw author HTML.
const PROSE_CLASSES =
  "max-w-none text-sm leading-relaxed text-zinc-300 " +
  "[&_h1]:mb-2 [&_h1]:mt-5 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:text-zinc-50 [&_h1:first-child]:mt-0 " +
  "[&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-zinc-50 [&_h2:first-child]:mt-0 " +
  "[&_h3]:mb-1.5 [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-zinc-100 [&_h3:first-child]:mt-0 " +
  "[&_h4]:mb-1.5 [&_h4]:mt-3 [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-zinc-100 " +
  "[&_p]:mb-3 [&_p:last-child]:mb-0 " +
  "[&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 " +
  "[&_a]:text-indigo-400 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-indigo-300 " +
  "[&_strong]:font-semibold [&_strong]:text-zinc-100 " +
  "[&_code]:rounded [&_code]:bg-zinc-800 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[13px] [&_code]:text-indigo-300 " +
  "[&_pre]:mb-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-zinc-800 [&_pre]:bg-zinc-950 [&_pre]:p-3 " +
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-zinc-300 " +
  "[&_blockquote]:border-l-2 [&_blockquote]:border-zinc-700 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-zinc-400 " +
  "[&_table]:mb-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-left " +
  "[&_th]:border [&_th]:border-zinc-800 [&_th]:bg-zinc-900 [&_th]:px-2 [&_th]:py-1 [&_th]:text-xs [&_th]:font-semibold [&_th]:text-zinc-300 " +
  "[&_td]:border [&_td]:border-zinc-800 [&_td]:px-2 [&_td]:py-1 [&_hr]:my-4 [&_hr]:border-zinc-800";

export function ArticleContent({ content, className = "" }: { content: string; className?: string }) {
  return (
    <div
      className={`${PROSE_CLASSES} ${className}`}
      // Safe: renderMarkdownToSafeHtml only ever emits a fixed tag set it
      // constructs itself and escapes every text run — see lib/markdown.ts.
      dangerouslySetInnerHTML={{ __html: renderMarkdownToSafeHtml(content) }}
    />
  );
}
