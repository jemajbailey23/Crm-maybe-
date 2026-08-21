"use client";

import { BulkActionBar } from "@/components/ui/bulk-select";
import { bulkDeleteContacts, bulkUpdateContactStatus } from "./bulk-actions";
import { bulkSendContactEmail } from "./email-actions";

export function ContactsBulkBar() {
  return (
    <BulkActionBar
      itemLabel="contact"
      actions={[
        {
          type: "modal",
          label: "Email selected",
          modalTitle: "Send email",
          description: "Sends one message per contact — recipients never see each other's addresses. Contacts with no email on file are skipped.",
          submitLabel: "Send",
          fields: [
            { name: "subject", label: "Subject", kind: "text", required: true },
            { name: "body", label: "Message", kind: "textarea", placeholder: "Write your message…", required: true },
          ],
          onRun: (ids, values) => bulkSendContactEmail(ids, values),
        },
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
