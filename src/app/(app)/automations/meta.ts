import type { AutomationActionType, AutomationEmailRecipient, AutomationTrigger } from "@prisma/client";

export const TRIGGERS: AutomationTrigger[] = [
  "LEAD_CREATED",
  "PROPOSAL_SENT",
  "INVOICE_PAID",
  "WEBSITE_PUBLISHED",
  "CLIENT_SIGNED",
  "TASK_OVERDUE",
  "REVIEW_REQUEST",
  "MISSED_CALL",
  "APPOINTMENT_BOOKED",
  "APPOINTMENT_RESCHEDULED",
  "APPOINTMENT_CANCELLED",
  "APPOINTMENT_COMPLETED",
  "APPOINTMENT_NO_SHOW",
];

export const TRIGGER_LABEL: Record<AutomationTrigger, string> = {
  LEAD_CREATED: "Lead Created",
  PROPOSAL_SENT: "Proposal Sent",
  INVOICE_PAID: "Invoice Paid",
  WEBSITE_PUBLISHED: "Website Published",
  CLIENT_SIGNED: "Client Signed",
  TASK_OVERDUE: "Task Overdue",
  REVIEW_REQUEST: "Review Request",
  MISSED_CALL: "Missed Call",
  APPOINTMENT_BOOKED: "Appointment Booked",
  APPOINTMENT_RESCHEDULED: "Appointment Rescheduled",
  APPOINTMENT_CANCELLED: "Appointment Cancelled",
  APPOINTMENT_COMPLETED: "Appointment Completed",
  APPOINTMENT_NO_SHOW: "Appointment No-Show",
};

export const TRIGGER_DESCRIPTION: Record<AutomationTrigger, string> = {
  LEAD_CREATED: "A new lead is added to Contacts.",
  PROPOSAL_SENT: 'A "Proposal" activity is logged on a contact.',
  INVOICE_PAID: "An invoice is marked Paid.",
  WEBSITE_PUBLISHED: 'A project named "Website" is marked Completed.',
  CLIENT_SIGNED: "A contact's contract status is set to Signed.",
  TASK_OVERDUE: "An open task's due date passes (checked when the Dashboard loads).",
  REVIEW_REQUEST: "Any project is marked Completed — a good moment to ask for a review.",
  MISSED_CALL: 'A Call activity is logged with "Missed call" checked.',
  APPOINTMENT_BOOKED: "Someone books a call through your public booking page.",
  APPOINTMENT_RESCHEDULED: "A visitor reschedules their own booking.",
  APPOINTMENT_CANCELLED: "A booking is cancelled, by the visitor or by you.",
  APPOINTMENT_COMPLETED: "You mark a booking as completed.",
  APPOINTMENT_NO_SHOW: "You mark a booking as a no-show.",
};

export const ACTION_TYPES: AutomationActionType[] = ["CREATE_TASK", "SEND_EMAIL", "WEBHOOK", "PUSH_NOTIFICATION"];

export const ACTION_LABEL: Record<AutomationActionType, string> = {
  CREATE_TASK: "Create a task",
  SEND_EMAIL: "Send an email",
  WEBHOOK: "Call a webhook URL",
  PUSH_NOTIFICATION: "Send me a push notification",
};

export const EMAIL_RECIPIENTS: AutomationEmailRecipient[] = ["OWNER", "CONTACT"];

export const EMAIL_RECIPIENT_LABEL: Record<AutomationEmailRecipient, string> = {
  OWNER: "Me (the business owner)",
  CONTACT: "The contact linked to this event",
};

type ActionSummaryInput = {
  actionType: AutomationActionType;
  taskTitle: string | null;
  taskDueInDays: number | null;
  emailRecipient: AutomationEmailRecipient;
  emailSubject: string | null;
  webhookUrl: string | null;
  pushTitle: string | null;
};

export function actionSummary(action: ActionSummaryInput) {
  if (action.actionType === "CREATE_TASK") {
    return `Create task${action.taskTitle ? ` "${action.taskTitle}"` : ""}, due in ${action.taskDueInDays ?? 1} day(s)`;
  }
  if (action.actionType === "SEND_EMAIL") {
    const who = action.emailRecipient === "CONTACT" ? "the contact" : "you";
    return `Email ${who}${action.emailSubject ? `: "${action.emailSubject}"` : ""}`;
  }
  if (action.actionType === "PUSH_NOTIFICATION") {
    return `Notify me${action.pushTitle ? `: "${action.pushTitle}"` : ""}`;
  }
  return `POST to ${action.webhookUrl || "(no URL set)"}`;
}

// One-line description of a rule's whole action chain, for the list page —
// "Create task ... → Email the contact ..." instead of just the first step.
export function actionsSummary(actions: ActionSummaryInput[]) {
  if (actions.length === 0) return "No actions configured yet";
  return actions.map(actionSummary).join(" → ");
}

// {{token}} placeholders usable in a task title, email subject/body, or
// push notification title/body, shown as clickable chips next to those
// fields so you don't have to remember or guess the exact syntax.
export const AUTOMATION_TOKENS: { token: string; description: string }[] = [
  { token: "{{name}}", description: "Contact's first name (or business name)" },
  { token: "{{email}}", description: "Contact's email address" },
  { token: "{{date}}", description: "The event's date/time, for triggers that involve one" },
];
