export const CATEGORIES: { value: string; label: string }[] = [
  { value: "SALES_SCRIPTS", label: "Sales Scripts" },
  { value: "DISCOVERY_QUESTIONS", label: "Discovery Questions" },
  { value: "SEO_SOPS", label: "SEO SOPs" },
  { value: "AI_AUTOMATION_SOPS", label: "AI Automation SOPs" },
  { value: "WEBSITE_SOPS", label: "Website SOPs" },
  { value: "PROPOSAL_TEMPLATES", label: "Proposal Templates" },
  { value: "EMAIL_TEMPLATES", label: "Email Templates" },
  { value: "PROMPT_LIBRARY", label: "Prompt Library" },
  { value: "OBJECTION_HANDLING", label: "Objection Handling" },
  { value: "BUSINESS_RESOURCES", label: "Business Resources" },
];

export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label])
);
