// LLM Provider abstraction - supports DeepSeek and OpenAI

export type LLMProvider = "deepseek" | "openai";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface LLMResponse {
  content: string;
  usage: LLMUsage;
  provider: LLMProvider;
  model: string;
  latencyMs: number;
}

interface ProviderConfig {
  apiUrl: string;
  model: string;
  apiKey: string;
}

const PROVIDER_CONFIGS: Record<LLMProvider, Omit<ProviderConfig, "apiKey">> = {
  deepseek: {
    apiUrl: "https://api.deepseek.com/chat/completions",
    model: "deepseek-chat",
  },
  openai: {
    apiUrl: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o", // Using GPT-4o for comparable quality
  },
};

// Session-level override (set via setSessionProvider before calling LLM)
let sessionProviderOverride: LLMProvider | null = null;

export function setSessionProvider(provider: LLMProvider | null) {
  sessionProviderOverride = provider;
}

function getProviderConfig(): { provider: LLMProvider; config: ProviderConfig } {
  // Session override takes precedence over env var
  const providerEnv = process.env.LLM_PROVIDER?.toLowerCase() as LLMProvider | undefined;
  const provider: LLMProvider = sessionProviderOverride ?? (providerEnv === "openai" ? "openai" : "deepseek");

  const apiKey =
    provider === "openai"
      ? process.env.OPENAI_API_KEY
      : process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    throw new Error(`${provider.toUpperCase()}_API_KEY not configured`);
  }

  return {
    provider,
    config: {
      ...PROVIDER_CONFIGS[provider],
      apiKey,
    },
  };
}

export async function callLLM(
  messages: LLMMessage[],
  options?: {
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
  }
): Promise<LLMResponse> {
  const { provider, config } = getProviderConfig();
  const startTime = Date.now();

  const requestBody: Record<string, unknown> = {
    model: config.model,
    messages,
    temperature: options?.temperature ?? 0.8,
    max_tokens: options?.maxTokens ?? 4000,
  };

  // JSON mode support differs by provider
  if (options?.jsonMode) {
    if (provider === "openai") {
      requestBody.response_format = { type: "json_object" };
    } else if (provider === "deepseek") {
      requestBody.response_format = { type: "json_object" };
    }
  }

  const response = await fetch(config.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${provider} API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const latencyMs = Date.now() - startTime;

  return {
    content: data.choices[0].message.content,
    usage: data.usage,
    provider,
    model: config.model,
    latencyMs,
  };
}

// For streaming responses
export function getStreamingConfig(): {
  provider: LLMProvider;
  apiUrl: string;
  apiKey: string;
  model: string;
} {
  const { provider, config } = getProviderConfig();
  return {
    provider,
    apiUrl: config.apiUrl,
    apiKey: config.apiKey,
    model: config.model,
  };
}

// Get current provider info (useful for debugging/UI)
export function getCurrentProvider(): { provider: LLMProvider; model: string } {
  const { provider, config } = getProviderConfig();
  return { provider, model: config.model };
}
