import type { AutomationActionType, AutomationTrigger } from "@prisma/client";

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
};

export const ACTION_TYPES: AutomationActionType[] = ["CREATE_TASK", "SEND_EMAIL", "WEBHOOK"];

export const ACTION_LABEL: Record<AutomationActionType, string> = {
  CREATE_TASK: "Create a task",
  SEND_EMAIL: "Send me an email",
  WEBHOOK: "Call a webhook URL",
};

export function actionSummary(rule: {
  actionType: AutomationActionType;
  taskTitle: string | null;
  taskDueInDays: number | null;
  emailSubject: string | null;
  webhookUrl: string | null;
}) {
  if (rule.actionType === "CREATE_TASK") {
    return `Create task${rule.taskTitle ? ` "${rule.taskTitle}"` : ""}, due in ${rule.taskDueInDays ?? 1} day(s)`;
  }
  if (rule.actionType === "SEND_EMAIL") {
    return `Email you${rule.emailSubject ? `: "${rule.emailSubject}"` : ""}`;
  }
  return `POST to ${rule.webhookUrl || "(no URL set)"}`;
}
