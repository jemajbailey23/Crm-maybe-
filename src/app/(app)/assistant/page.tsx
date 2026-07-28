import { AssistantChat } from "./chat";

export default function AssistantPage() {
  return (
    <div className="flex h-[calc(100vh-6rem)] max-w-3xl flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          AI Assistant
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Ask about leads, clients, invoices, or have it draft something for you.
        </p>
      </div>
      <AssistantChat />
    </div>
  );
}
