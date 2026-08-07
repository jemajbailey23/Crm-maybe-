"use client";

import { BulkActionBar } from "@/components/ui/bulk-select";
import { bulkDeleteTasks, bulkCompleteTasks } from "./actions";

export function TasksBulkBar({ exportHref }: { exportHref: string }) {
  return (
    <BulkActionBar
      itemLabel="task"
      actions={[
        { label: "Mark Complete", onRun: (ids) => bulkCompleteTasks(ids) },
        { type: "link", label: "Export selected", href: (ids) => `${exportHref}&ids=${ids.join(",")}` },
        {
          label: "Delete",
          variant: "danger",
          confirmMessage: "Delete {n} task(s)? This can't be undone.",
          onRun: (ids) => bulkDeleteTasks(ids),
        },
      ]}
    />
  );
}
