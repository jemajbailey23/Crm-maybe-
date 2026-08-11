import type { AutomationTrigger } from "@prisma/client";
import type { ActionDefaults } from "./automation-form";

export type AutomationTemplate = {
  key: string;
  name: string;
  description: string;
  trigger: AutomationTrigger;
  actions: ActionDefaults[];
};

// Starter presets shown on "New automation" so setup starts from something
// close to what you want instead of a blank trigger/action picker. Each one
// is just a normal rule once created — fully editable, including adding or
// removing steps.
//
// Deliberately doesn't include a booking-confirmation template: that email
// is already sent automatically by the booking flow itself
// (lib/booking-notify.ts), so a matching automation here would double-send.
export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    key: "welcome-new-lead",
    name: "Follow up on new leads fast",
    description:
      "Creates a task to call a new lead within a day of them coming in, and pushes an alert to your phone/computer the moment they come in.",
    trigger: "LEAD_CREATED",
    actions: [
      { actionType: "CREATE_TASK", taskTitle: "Call new lead: {{name}}", taskDueInDays: 1 },
      { actionType: "PUSH_NOTIFICATION", pushTitle: "New lead", pushBody: "{{name}} just came in." },
    ],
  },
  {
    key: "onboard-signed-client",
    name: "Kick off onboarding when a contract is signed",
    description: "Starts an onboarding task and sends the client a welcome email — one event, two steps.",
    trigger: "CLIENT_SIGNED",
    actions: [
      { actionType: "CREATE_TASK", taskTitle: "Start onboarding checklist for {{name}}", taskDueInDays: 1 },
      {
        actionType: "SEND_EMAIL",
        emailRecipient: "CONTACT",
        emailSubject: "Welcome aboard!",
        emailBody:
          "Hi {{name}},\n\nExcited to get started! You'll hear from us shortly with next steps.\n\nTalk soon,",
      },
    ],
  },
  {
    key: "thank-after-payment",
    name: "Thank clients when they pay",
    description:
      "Emails the contact a short thank-you the moment an invoice is marked paid, and pushes an alert to your phone/computer so you know it landed.",
    trigger: "INVOICE_PAID",
    actions: [
      {
        actionType: "SEND_EMAIL",
        emailRecipient: "CONTACT",
        emailSubject: "Thank you for your payment",
        emailBody: "Hi {{name}},\n\nThanks — your payment has been received. Appreciate you!",
      },
      { actionType: "PUSH_NOTIFICATION", pushTitle: "Invoice paid", pushBody: "{{name}} just paid an invoice." },
    ],
  },
  {
    key: "notify-overdue-task-push",
    name: "Push alert for overdue tasks",
    description: "Sends a push notification to your phone/computer whenever an open task's due date passes.",
    trigger: "TASK_OVERDUE",
    actions: [{ actionType: "PUSH_NOTIFICATION", pushTitle: "Task overdue" }],
  },
  {
    key: "ask-for-review",
    name: "Ask for a review after wrapping up",
    description: "Emails the client asking for a review once a project is marked completed.",
    trigger: "REVIEW_REQUEST",
    actions: [
      {
        actionType: "SEND_EMAIL",
        emailRecipient: "CONTACT",
        emailSubject: "Got 2 minutes?",
        emailBody:
          "Hi {{name}},\n\nSo glad we got to work together. If you have a moment, a quick review would mean a lot!",
      },
    ],
  },
  {
    key: "remind-overdue-tasks",
    name: "Remind me about overdue tasks",
    description: "Emails you directly whenever an open task's due date passes.",
    trigger: "TASK_OVERDUE",
    actions: [{ actionType: "SEND_EMAIL", emailRecipient: "OWNER" }],
  },
  {
    key: "followup-missed-call",
    name: "Follow up on missed calls",
    description: "Creates a same-day callback task whenever you log a missed call.",
    trigger: "MISSED_CALL",
    actions: [{ actionType: "CREATE_TASK", taskTitle: "Call back {{name}}", taskDueInDays: 0 }],
  },
  {
    key: "prep-before-booking",
    name: "Prep before a booked call",
    description:
      "Creates a same-day prep task when someone books a call — separate from the automatic booking confirmation email, which already goes out on its own.",
    trigger: "APPOINTMENT_BOOKED",
    actions: [{ actionType: "CREATE_TASK", taskTitle: "Prep notes for call with {{name}}", taskDueInDays: 0 }],
  },
  {
    key: "reengage-no-show",
    name: "Re-engage no-shows",
    description: "Emails the contact to reschedule when you mark a booking as a no-show.",
    trigger: "APPOINTMENT_NO_SHOW",
    actions: [
      {
        actionType: "SEND_EMAIL",
        emailRecipient: "CONTACT",
        emailSubject: "Let's find a new time",
        emailBody: "Hi {{name}},\n\nLooks like we missed each other for {{date}} — want to grab a new time?",
      },
    ],
  },
];
