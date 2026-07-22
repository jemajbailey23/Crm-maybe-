import Link from "next/link";
import { ImportForm } from "./import-form";

export default function ImportContactsPage() {
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Import contacts</h1>
        <p className="text-sm text-slate-500">
          Upload a CSV to bring in contacts from a spreadsheet or another
          tool.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
        <div className="text-sm text-slate-600">
          <p>
            Expected columns: <code className="text-slate-900">firstName</code>,{" "}
            <code className="text-slate-900">lastName</code> (required), plus
            any of <code className="text-slate-900">email</code>,{" "}
            <code className="text-slate-900">phone</code>,{" "}
            <code className="text-slate-900">title</code>,{" "}
            <code className="text-slate-900">company</code>,{" "}
            <code className="text-slate-900">tags</code>,{" "}
            <code className="text-slate-900">notes</code>. Column order
            doesn&apos;t matter, and matching is case-insensitive. A company
            name that doesn&apos;t exist yet gets created automatically.
          </p>
          <a
            href="/contacts-template.csv"
            download
            className="mt-2 inline-block font-medium text-slate-900 underline"
          >
            Download an example CSV
          </a>
        </div>

        <ImportForm />
      </div>

      <Link href="/contacts" className="text-sm font-medium text-slate-500 hover:text-slate-900">
        ← Back to contacts
      </Link>
    </div>
  );
}
