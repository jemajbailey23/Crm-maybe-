import { AutomationForm } from "../automation-form";
import { createAutomationRule } from "../actions";

export default function NewAutomationPage() {
  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          New automation
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Choose a trigger and what should happen automatically when it fires.
        </p>
      </div>
      <AutomationForm action={createAutomationRule} submitLabel="Create automation" />
    </div>
  );
}
