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
  NEW_LEAD: "default",
  RESEARCHING: "default",
  READY_TO_CONTACT: "default",
  CONTACTED: "blue",
  DISCOVERY_SCHEDULED: "blue",
  DISCOVERY_COMPLETED: "violet",
  PROPOSAL_SENT: "amber",
  NEGOTIATION: "amber",
  WON: "emerald",
  LOST: "red",
  NURTURE: "violet",
};

const DEAL_STAGE_LABEL: Record<string, string> = {
  NEW_LEAD: "New Lead",
  RESEARCHING: "Researching",
  READY_TO_CONTACT: "Ready to Contact",
  CONTACTED: "Contacted",
  DISCOVERY_SCHEDULED: "Discovery Scheduled",
  DISCOVERY_COMPLETED: "Discovery Completed",
  PROPOSAL_SENT: "Proposal Sent",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
  NURTURE: "Nurture",
};

export function DealStageBadge({ stage, label }: { stage: string; label?: string }) {
  return (
    <Badge variant={DEAL_STAGE_VARIANT[stage] ?? "default"}>
      {label ?? DEAL_STAGE_LABEL[stage] ?? stage}
    </Badge>
  );
}

const TASK_STATUS_VARIANT: Record<string, BadgeVariant> = {
  BACKLOG: "default",
  READY: "default",
  IN_PROGRESS: "blue",
  WAITING: "amber",
  BLOCKED: "red",
  REVIEW: "violet",
  COMPLETED: "emerald",
  CANCELLED: "default",
};

const TASK_STATUS_LABEL: Record<string, string> = {
  BACKLOG: "Backlog",
  READY: "Ready",
  IN_PROGRESS: "In Progress",
  WAITING: "Waiting",
  BLOCKED: "Blocked",
  REVIEW: "Review",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function TaskStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={TASK_STATUS_VARIANT[status] ?? "default"}>
      {TASK_STATUS_LABEL[status] ?? status}
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
  HIGH: "amber",
  CRITICAL: "red",
};

const PRIORITY_LABEL: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
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
  PLANNING: "default",
  IN_PROGRESS: "blue",
  WAITING_ON_CLIENT: "amber",
  WAITING_ON_APPROVAL: "amber",
  BLOCKED: "red",
  QUALITY_REVIEW: "violet",
  COMPLETED: "emerald",
  PAUSED: "default",
  CANCELLED: "default",
};

const PROJECT_STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: "Not started",
  PLANNING: "Planning",
  IN_PROGRESS: "In progress",
  WAITING_ON_CLIENT: "Waiting on client",
  WAITING_ON_APPROVAL: "Waiting on approval",
  BLOCKED: "Blocked",
  QUALITY_REVIEW: "Quality review",
  COMPLETED: "Completed",
  PAUSED: "Paused",
  CANCELLED: "Cancelled",
};

export function ProjectStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={PROJECT_STATUS_VARIANT[status] ?? "default"}>
      {PROJECT_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

const PROJECT_HEALTH_VARIANT: Record<string, BadgeVariant> = {
  ON_TRACK: "emerald",
  NEEDS_ATTENTION: "amber",
  AT_RISK: "red",
  BLOCKED: "red",
};

const PROJECT_HEALTH_LABEL: Record<string, string> = {
  ON_TRACK: "On track",
  NEEDS_ATTENTION: "Needs attention",
  AT_RISK: "At risk",
  BLOCKED: "Blocked",
};

export function ProjectHealthBadge({ health }: { health: string }) {
  return (
    <Badge variant={PROJECT_HEALTH_VARIANT[health] ?? "default"}>
      {PROJECT_HEALTH_LABEL[health] ?? health}
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
  CUSTOM: "Repeats on a custom interval",
};

export function RecurrenceBadge({ recurrence }: { recurrence: string }) {
  if (recurrence === "NONE") return null;
  return <Badge variant="violet">{RECURRENCE_LABEL[recurrence] ?? recurrence}</Badge>;
}

const KNOWLEDGE_STATUS_VARIANT: Record<string, BadgeVariant> = {
  DRAFT: "default",
  PUBLISHED: "emerald",
  ARCHIVED: "red",
};

const KNOWLEDGE_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

export function KnowledgeStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={KNOWLEDGE_STATUS_VARIANT[status] ?? "default"}>
      {KNOWLEDGE_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

const KNOWLEDGE_VISIBILITY_VARIANT: Record<string, BadgeVariant> = {
  BVD_INTERNAL: "violet",
  CLIENT_PRIVATE: "amber",
  CLIENT_SHARED: "blue",
  PUBLIC: "emerald",
};

const KNOWLEDGE_VISIBILITY_LABEL: Record<string, string> = {
  BVD_INTERNAL: "BVD Internal",
  CLIENT_PRIVATE: "Client Private",
  CLIENT_SHARED: "Client Shared",
  PUBLIC: "Public",
};

export function KnowledgeVisibilityBadge({ visibility }: { visibility: string }) {
  return (
    <Badge variant={KNOWLEDGE_VISIBILITY_VARIANT[visibility] ?? "default"}>
      {KNOWLEDGE_VISIBILITY_LABEL[visibility] ?? visibility}
    </Badge>
  );
}

export function AiEnabledBadge({ enabled }: { enabled: boolean }) {
  return (
    <Badge variant={enabled ? "emerald" : "default"}>{enabled ? "AI enabled" : "AI disabled"}</Badge>
  );
}

const BOOKING_STATUS_VARIANT: Record<string, BadgeVariant> = {
  CONFIRMED: "blue",
  CANCELLED: "red",
  COMPLETED: "emerald",
  NO_SHOW: "amber",
  RESCHEDULED: "violet",
};

const BOOKING_STATUS_LABEL: Record<string, string> = {
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  NO_SHOW: "No-show",
  RESCHEDULED: "Rescheduled",
};

export function BookingStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={BOOKING_STATUS_VARIANT[status] ?? "default"}>
      {BOOKING_STATUS_LABEL[status] ?? status}
    </Badge>
  );
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
