import Link from "next/link";
import { ImportForm } from "./import-form";

export default function ImportContactsPage() {
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Import contacts</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Upload a CSV to bring in contacts from a spreadsheet or another
          tool.
        </p>
      </div>

      <div className="animate-slide-up space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="text-sm text-zinc-400">
          <p>
            Requires either a person&apos;s{" "}
            <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-200">firstName</code> +{" "}
            <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-200">lastName</code>, or a{" "}
            <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-200">businessName</code> for
            business-lead lists with no individual contact yet. Also supports{" "}
            <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-200">email</code>,{" "}
            <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-200">phone</code>,{" "}
            <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-200">title</code>,{" "}
            <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-200">company</code>,{" "}
            <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-200">industry</code>,{" "}
            <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-200">website</code>,{" "}
            <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-200">address</code>,{" "}
            <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-200">priority</code> (Low/Medium/
            High/Critical), <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-200">leadSource</code>,{" "}
            <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-200">nextFollowUpAt</code>,{" "}
            <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-200">currentProblems</code>,{" "}
            <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-200">tags</code>,{" "}
            <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-200">notes</code>. Column order
            doesn&apos;t matter, and matching is case-insensitive. A company
            name that doesn&apos;t exist yet gets created automatically.
          </p>
          <a
            href="/contacts-template.csv"
            download
            className="mt-2 inline-block font-medium text-indigo-400 hover:text-indigo-300"
          >
            Download an example CSV
          </a>
        </div>

        <ImportForm />
      </div>

      <Link href="/contacts" className="text-sm font-medium text-zinc-500 hover:text-zinc-300">
        ← Back to contacts
      </Link>
    </div>
  );
}
