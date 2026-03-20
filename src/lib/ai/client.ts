import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function callClaude(params: {
  system: string;
  userMessage: string;
  maxTokens?: number;
  model?: string;
}): Promise<string> {
  const response = await anthropic.messages.create({
    model: params.model ?? "claude-sonnet-4-20250514",
    max_tokens: params.maxTokens ?? 4096,
    system: params.system,
    messages: [{ role: "user", content: params.userMessage }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock ? textBlock.text : "";
}

export async function callClaudeJSON<T>(params: {
  system: string;
  userMessage: string;
  maxTokens?: number;
  model?: string;
}): Promise<T> {
  const result = await callClaude({
    ...params,
    system: params.system + "\n\nYou MUST respond with valid JSON only. No markdown, no code fences, no explanation. Just the JSON object.",
  });

  const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`AI returned invalid JSON. Response started with: "${cleaned.slice(0, 200)}"`);
  }
}
