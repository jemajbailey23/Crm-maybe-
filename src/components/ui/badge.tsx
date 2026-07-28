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

export function DealStageBadge({ stage }: { stage: string }) {
  return (
    <Badge variant={DEAL_STAGE_VARIANT[stage] ?? "default"}>
      {DEAL_STAGE_LABEL[stage] ?? stage}
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
};

export function ActivityTypeBadge({ type }: { type: string }) {
  return (
    <Badge variant={ACTIVITY_TYPE_VARIANT[type] ?? "default"}>
      {type.charAt(0) + type.slice(1).toLowerCase()}
    </Badge>
  );
}
