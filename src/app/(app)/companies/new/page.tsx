import { CompanyForm } from "../company-form";
import { createCompany } from "../actions";

export default function NewCompanyPage() {
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">New company</h1>
        <p className="mt-1 text-sm text-zinc-500">Add a business to your CRM.</p>
      </div>
      <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <CompanyForm action={createCompany} submitLabel="Create company" />
      </div>
    </div>
  );
}
