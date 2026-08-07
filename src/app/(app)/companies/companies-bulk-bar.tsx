"use client";

import { BulkActionBar } from "@/components/ui/bulk-select";
import { bulkDeleteCompanies } from "./bulk-actions";

export function CompaniesBulkBar() {
  return (
    <BulkActionBar
      itemLabel="company"
      itemLabelPlural="companies"
      actions={[
        { type: "link", label: "Export selected", href: (ids) => `/companies/export?ids=${ids.join(",")}` },
        {
          label: "Delete",
          variant: "danger",
          confirmMessage: "Delete {n} selected companies? This can't be undone.",
          onRun: (ids) => bulkDeleteCompanies(ids),
        },
      ]}
    />
  );
}
