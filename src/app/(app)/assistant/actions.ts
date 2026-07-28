"use server";

import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient } from "@/lib/anthropic";
import { requireUser } from "@/lib/auth";
import { TOOLS, executeTool } from "./tools";

export type ChatMessage = { role: "user" | "assistant"; content: string };

const MAX_TOOL_ITERATIONS = 6;

function systemPrompt(userName: string, businessTimezone: string) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: businessTimezone,
  });

  return `You are the internal AI assistant for Bailey Ventures Digital's CRM, helping ${userName} run the business. Today is ${today}.

Use the provided tools to look up real data before answering questions about leads, clients, invoices, or tasks — never guess or make up numbers, names, or dates. When asked to draft a proposal, follow-up email, or summary for a specific client, call get_client_history first and ground the draft in their actual situation (industry, problems, desired outcome, deal value, pipeline stage). When drafting emails or proposals, write them ready to send or copy — no placeholder brackets unless information is genuinely unknown. Keep answers concise and skimmable: use short lists for data lookups, prose for summaries and priorities. Dollar amounts should be formatted like $1,200.`;
}

export async function askAssistant(
  history: ChatMessage[],
  message: string
): Promise<{ reply: string; error?: string }> {
  const user = await requireUser();

  let client;
  try {
    client = getAnthropicClient();
  } catch (err) {
    return { reply: "", error: err instanceof Error ? err.message : "AI assistant unavailable." };
  }

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content }) as Anthropic.MessageParam),
    { role: "user", content: message },
  ];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    let response;
    try {
      response = await client.messages.create({
        model: "claude-opus-5",
        max_tokens: 4096,
        system: systemPrompt(user.name, user.bookingTimezone),
        tools: TOOLS,
        output_config: { effort: "medium" },
        messages,
      });
    } catch (err) {
      return {
        reply: "",
        error: err instanceof Error ? err.message : "The assistant hit an error.",
      };
    }

    if (response.stop_reason === "refusal") {
      return { reply: "I'm not able to help with that request." };
    }

    messages.push({ role: "assistant", content: response.content });

    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    if (toolUses.length === 0) {
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return { reply: text || "I didn't have anything to add." };
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUses) {
      const result = await executeTool(
        toolUse.name,
        toolUse.input as Record<string, unknown>
      );
      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: JSON.stringify(result),
      });
    }
    messages.push({ role: "user", content: toolResults });
  }

  return { reply: "That took more steps than expected — try narrowing the question." };
}
