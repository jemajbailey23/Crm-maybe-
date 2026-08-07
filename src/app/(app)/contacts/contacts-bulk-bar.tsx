"use client";

import { BulkActionBar } from "@/components/ui/bulk-select";
import { bulkDeleteContacts, bulkUpdateContactStatus } from "./bulk-actions";

export function ContactsBulkBar() {
  return (
    <BulkActionBar
      itemLabel="contact"
      actions={[
        { label: "Mark as Client", onRun: (ids) => bulkUpdateContactStatus(ids, "CLIENT") },
        { label: "Mark as Lead", onRun: (ids) => bulkUpdateContactStatus(ids, "LEAD") },
        { type: "link", label: "Export selected", href: (ids) => `/contacts/export?ids=${ids.join(",")}` },
        {
          label: "Delete",
          variant: "danger",
          confirmMessage: "Delete {n} contact(s)? This can't be undone.",
          onRun: (ids) => bulkDeleteContacts(ids),
        },
      ]}
    />
  );
}
