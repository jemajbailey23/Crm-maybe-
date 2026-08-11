import type { DealStage } from "@prisma/client";

export type DefaultMeetingType = {
  name: string;
  description: string;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
  intakeQuestions: { id: string; label: string; required: boolean }[];
  confirmationSubject: string;
  confirmationBody: string;
  reminderHoursBefore: number[];
  cancellationPolicy: string;
  minCancelNoticeHours: number;
  allowRescheduling: boolean;
  relatedDealStage: DealStage | null;
  sortOrder: number;
};

// The 5 required Stage 7 meeting types, with real (not placeholder)
// defaults an owner could genuinely use as-is — every field is editable
// afterward from /booking/meeting-types/[id].
export const DEFAULT_MEETING_TYPES: DefaultMeetingType[] = [
  {
    name: "Discovery Call",
    description: "A first conversation to learn about your business and see if we're a fit.",
    durationMinutes: 30,
    bufferBeforeMinutes: 5,
    bufferAfterMinutes: 5,
    minNoticeHours: 12,
    maxAdvanceDays: 30,
    intakeQuestions: [
      { id: "q1", label: "What's your business or website URL?", required: true },
      { id: "q2", label: "What are you hoping to achieve?", required: false },
    ],
    confirmationSubject: "Confirmed: Discovery Call with Bailey Ventures Digital",
    confirmationBody:
      "Hi {{name}},\n\nYou're confirmed for a Discovery Call on {{date}}. We'll spend 30 minutes learning about your business and goals to see how we can help.",
    reminderHoursBefore: [24, 1],
    cancellationPolicy: "Please give at least 24 hours' notice if you need to cancel or reschedule.",
    minCancelNoticeHours: 24,
    allowRescheduling: true,
    relatedDealStage: "DISCOVERY_SCHEDULED",
    sortOrder: 0,
  },
  {
    name: "Strategy Session",
    description: "A deeper working session to map out a plan after an initial discovery call.",
    durationMinutes: 45,
    bufferBeforeMinutes: 10,
    bufferAfterMinutes: 10,
    minNoticeHours: 24,
    maxAdvanceDays: 45,
    intakeQuestions: [{ id: "q1", label: "What's changed since our last conversation?", required: false }],
    confirmationSubject: "Confirmed: Strategy Session with Bailey Ventures Digital",
    confirmationBody:
      "Hi {{name}},\n\nYou're confirmed for a Strategy Session on {{date}}. Come ready to dig into specifics — we'll leave with a clear plan.",
    reminderHoursBefore: [24, 2],
    cancellationPolicy: "Please give at least 24 hours' notice if you need to cancel or reschedule.",
    minCancelNoticeHours: 24,
    allowRescheduling: true,
    relatedDealStage: "DISCOVERY_COMPLETED",
    sortOrder: 1,
  },
  {
    name: "Client Kickoff",
    description: "The official start of a new engagement — introductions, goals, and next steps.",
    durationMinutes: 60,
    bufferBeforeMinutes: 10,
    bufferAfterMinutes: 15,
    minNoticeHours: 48,
    maxAdvanceDays: 60,
    intakeQuestions: [{ id: "q1", label: "Who else from your team should join?", required: true }],
    confirmationSubject: "Confirmed: Client Kickoff with Bailey Ventures Digital",
    confirmationBody:
      "Hi {{name}},\n\nWelcome aboard! Your Client Kickoff is confirmed for {{date}}. We'll cover goals, timeline, and how we'll work together.",
    reminderHoursBefore: [48, 24, 1],
    cancellationPolicy: "Please give at least 48 hours' notice if you need to reschedule this kickoff.",
    minCancelNoticeHours: 48,
    allowRescheduling: true,
    relatedDealStage: null,
    sortOrder: 2,
  },
  {
    name: "Monthly Review",
    description: "A recurring check-in to review performance and plan the month ahead.",
    durationMinutes: 30,
    bufferBeforeMinutes: 5,
    bufferAfterMinutes: 5,
    minNoticeHours: 24,
    maxAdvanceDays: 45,
    intakeQuestions: [{ id: "q1", label: "Any specific topics you'd like to cover?", required: false }],
    confirmationSubject: "Confirmed: Monthly Review with Bailey Ventures Digital",
    confirmationBody: "Hi {{name}},\n\nYour Monthly Review is confirmed for {{date}}. We'll go over results and priorities for the month ahead.",
    reminderHoursBefore: [24],
    cancellationPolicy: "Please give at least 24 hours' notice if you need to reschedule.",
    minCancelNoticeHours: 24,
    allowRescheduling: true,
    relatedDealStage: null,
    sortOrder: 3,
  },
  {
    name: "Support Call",
    description: "A quick call for an active client with a question or issue.",
    durationMinutes: 20,
    bufferBeforeMinutes: 5,
    bufferAfterMinutes: 5,
    minNoticeHours: 4,
    maxAdvanceDays: 14,
    intakeQuestions: [{ id: "q1", label: "Briefly describe the issue", required: true }],
    confirmationSubject: "Confirmed: Support Call with Bailey Ventures Digital",
    confirmationBody: "Hi {{name}},\n\nYour Support Call is confirmed for {{date}}. We'll get your issue sorted.",
    reminderHoursBefore: [1],
    cancellationPolicy: "Please give at least 2 hours' notice if you need to cancel.",
    minCancelNoticeHours: 2,
    allowRescheduling: true,
    relatedDealStage: null,
    sortOrder: 4,
  },
];
