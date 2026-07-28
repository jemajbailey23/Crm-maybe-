type BadgeVariant = "default" | "blue" | "amber" | "emerald" | "red" | "violet";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: "bg-zinc-800 text-zinc-300",
  blue: "bg-blue-500/10 text-blue-400 ring-1 ring-inset ring-blue-500/20",
  amber: "bg-amber-500/10 text-amber-400 ring-1 ring-inset ring-amber-500/20",
  emerald: "bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20",
  red: "bg-red-500/10 text-red-400 ring-1 ring-inset ring-red-500/20",
  violet: "bg-violet-500/10 text-violet-400 ring-1 ring-inset ring-violet-500/20",
};

export function Badge({
  variant = "default",
  children,
  className = "",
}: {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

const DEAL_STAGE_VARIANT: Record<string, BadgeVariant> = {
  NEW: "default",
  CONTACTED: "blue",
  PROPOSAL: "amber",
  WON: "emerald",
  LOST: "red",
};

const DEAL_STAGE_LABEL: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  PROPOSAL: "Proposal",
  WON: "Won",
  LOST: "Lost",
};

export function DealStageBadge({ stage, label }: { stage: string; label?: string }) {
  return (
    <Badge variant={DEAL_STAGE_VARIANT[stage] ?? "default"}>
      {label ?? DEAL_STAGE_LABEL[stage] ?? stage}
    </Badge>
  );
}

export function TaskStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={status === "DONE" ? "emerald" : "default"}>
      {status === "DONE" ? "Done" : "Open"}
    </Badge>
  );
}

const ACTIVITY_TYPE_VARIANT: Record<string, BadgeVariant> = {
  NOTE: "default",
  CALL: "blue",
  EMAIL: "violet",
  MEETING: "amber",
  SMS: "emerald",
  FACEBOOK_MESSAGE: "blue",
  DEMO: "violet",
  PROPOSAL: "amber",
};

const ACTIVITY_TYPE_LABEL: Record<string, string> = {
  NOTE: "Note",
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
  SMS: "SMS",
  FACEBOOK_MESSAGE: "Facebook message",
  DEMO: "Demo",
  PROPOSAL: "Proposal",
};

export function ActivityTypeBadge({ type }: { type: string }) {
  return (
    <Badge variant={ACTIVITY_TYPE_VARIANT[type] ?? "default"}>
      {ACTIVITY_TYPE_LABEL[type] ?? type}
    </Badge>
  );
}

const PRIORITY_VARIANT: Record<string, BadgeVariant> = {
  LOW: "default",
  MEDIUM: "blue",
  HIGH: "red",
};

const PRIORITY_LABEL: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge variant={PRIORITY_VARIANT[priority] ?? "default"}>
      {PRIORITY_LABEL[priority] ?? priority}
    </Badge>
  );
}

const PROJECT_STATUS_VARIANT: Record<string, BadgeVariant> = {
  NOT_STARTED: "default",
  IN_PROGRESS: "blue",
  ON_HOLD: "amber",
  COMPLETED: "emerald",
};

const PROJECT_STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
};

export function ProjectStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={PROJECT_STATUS_VARIANT[status] ?? "default"}>
      {PROJECT_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

const CONTRACT_STATUS_VARIANT: Record<string, BadgeVariant> = {
  NOT_SENT: "default",
  SENT: "blue",
  SIGNED: "emerald",
  EXPIRED: "red",
};

const CONTRACT_STATUS_LABEL: Record<string, string> = {
  NOT_SENT: "Not sent",
  SENT: "Sent",
  SIGNED: "Signed",
  EXPIRED: "Expired",
};

export function ContractStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={CONTRACT_STATUS_VARIANT[status] ?? "default"}>
      {CONTRACT_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

const INVOICE_STATUS_VARIANT: Record<string, BadgeVariant> = {
  DRAFT: "default",
  SENT: "blue",
  PAID: "emerald",
  OVERDUE: "red",
};

const INVOICE_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PAID: "Paid",
  OVERDUE: "Overdue",
};

export function InvoiceStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={INVOICE_STATUS_VARIANT[status] ?? "default"}>
      {INVOICE_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

export function PaymentStatusBadge({
  status,
}: {
  status: "current" | "pending" | "overdue" | "none";
}) {
  const variant: BadgeVariant =
    status === "overdue" ? "red" : status === "pending" ? "amber" : status === "current" ? "emerald" : "default";
  const label =
    status === "overdue"
      ? "Overdue"
      : status === "pending"
        ? "Payment pending"
        : status === "current"
          ? "Current"
          : "No invoices";
  return <Badge variant={variant}>{label}</Badge>;
}

const RECURRENCE_LABEL: Record<string, string> = {
  DAILY: "Repeats daily",
  WEEKLY: "Repeats weekly",
  MONTHLY: "Repeats monthly",
};

export function RecurrenceBadge({ recurrence }: { recurrence: string }) {
  if (recurrence === "NONE") return null;
  return <Badge variant="violet">{RECURRENCE_LABEL[recurrence] ?? recurrence}</Badge>;
}

export function LabelChips({ labels }: { labels: string | null | undefined }) {
  const items = (labels ?? "")
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);
  if (items.length === 0) return null;
  return (
    <>
      {items.map((label) => (
        <Badge key={label} variant="default">
          {label}
        </Badge>
      ))}
    </>
  );
}
