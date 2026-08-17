export type PlatformAiProvider =
  | "openai"
  | "anthropic"
  | "gemini"
  | "openrouter"
  | "mistral"
  | "groq"
  | "deepseek"
  | "together"
  | "fireworks"
  | "perplexity"
  | "cohere"
  | "jamba"
  | "xai"
  | "zhipu"
  | "yandex"
  | "baidu"
  | "ollama"
  | "kimi"
  | "vllm";

export type PlatformAiConfig = {
  provider: PlatformAiProvider;
  model: string;
  apiKeyMasked: string;
  configured: boolean;
  semanticSearch: boolean;
  updatedAt?: string;
};

const DEFAULT_MODEL = "gpt-4o-mini";

const g = globalThis as unknown as { __epaAiConfig?: PlatformAiConfig & { apiKey?: string } };

function maskKey(value: string) {
  if (!value) return "";
  if (value.length <= 10) return "••••••••";
  return `${value.slice(0, 7)}••••${value.slice(-4)}`;
}

export function getPlatformAiConfig(): PlatformAiConfig {
  const envKey = process.env.OPENAI_API_KEY ?? "";
  const envModel = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
  const stored = g.__epaAiConfig;
  const apiKey = envKey || stored?.apiKey || "";
  return {
    provider: stored?.provider ?? "openai",
    model: stored?.model || envModel,
    apiKeyMasked: apiKey ? maskKey(apiKey) : "",
    configured: Boolean(apiKey),
    semanticSearch: stored?.semanticSearch ?? false,
    updatedAt: stored?.updatedAt
  };
}

export function updatePlatformAiConfig(patch: {
  provider?: PlatformAiProvider;
  model?: string;
  apiKey?: string;
  semanticSearch?: boolean;
}) {
  const current = g.__epaAiConfig;
  const nextKey = patch.apiKey && !patch.apiKey.includes("•") ? patch.apiKey : current?.apiKey ?? "";
  g.__epaAiConfig = {
    provider: patch.provider ?? current?.provider ?? "openai",
    model: patch.model ?? current?.model ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
    apiKey: nextKey,
    apiKeyMasked: nextKey ? maskKey(nextKey) : "",
    configured: Boolean(nextKey || process.env.OPENAI_API_KEY),
    semanticSearch: patch.semanticSearch ?? current?.semanticSearch ?? false,
    updatedAt: new Date().toISOString()
  };
  return getPlatformAiConfig();
}

export async function callPlatformOpenAi({
  question,
  context,
  system
}: {
  question: string;
  context: unknown;
  system: string;
}) {
  const stored = g.__epaAiConfig;
  const apiKey = process.env.OPENAI_API_KEY || stored?.apiKey || "";
  const model = stored?.model || process.env.OPENAI_MODEL || DEFAULT_MODEL;
  if (!apiKey) return null;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify({ question, context }) }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with ${response.status}`);
  }

  const body = await response.json() as { choices?: { message?: { content?: string } }[] };
  const content = body.choices?.[0]?.message?.content;
  if (!content) return null;
  return JSON.parse(content) as {
    headline?: string;
    detail?: string;
    rows?: { label: string; value: string; href?: string }[];
    source?: string;
    toolCalls?: { name: string; status: string; durationMs: number }[];
    panel?: string;
  };
}
