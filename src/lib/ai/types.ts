/** Names accepted in AI_PROVIDER. */
export const AI_PROVIDERS = ["gemini", "anthropic", "openai-compatible", "mock"] as const;
export type AiProviderName = (typeof AI_PROVIDERS)[number];

/** Options every adapter understands. All optional. */
export type GenerateOptions = {
  /** Instructions that frame the task (role, rubric, grading policy). */
  system?: string;
  /** 0 = deterministic. Grading uses a low value. */
  temperature?: number;
  /** Give up after this long. Defaults to 90 s. */
  timeoutMs?: number;
};

export type JsonRequest = GenerateOptions & {
  model: string;
  prompt: string;
  /** JSON Schema (from zod) the reply must follow. */
  jsonSchema: Record<string, unknown>;
  /** Only the mock provider uses it: a ready-made valid answer instead of its generic filler. */
  mockFixture?: () => unknown;
};

/**
 * One adapter per provider. It sends the request and returns the model's raw
 * text, which should be JSON; `generateJSON` parses and validates it.
 * Adapters throw AiError for every failure.
 */
export type ProviderAdapter = {
  name: AiProviderName;
  /** Models tried, in order, when no model is configured. Empty: one must be set. */
  defaultModels: string[];
  generateJSON(request: JsonRequest): Promise<string>;
};
