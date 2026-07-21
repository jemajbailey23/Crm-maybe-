import { CompanyForm } from "../company-form";
import { createCompany } from "../actions";

export default function NewCompanyPage() {
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">New company</h1>
        <p className="text-sm text-slate-500">Add a business to your CRM.</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <CompanyForm action={createCompany} submitLabel="Create company" />
      </div>
    </div>
  );
}
