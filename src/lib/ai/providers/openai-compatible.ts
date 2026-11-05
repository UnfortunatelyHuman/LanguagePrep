import { AiError } from "../errors";
import type { JsonRequest, ProviderAdapter } from "../types";

/**
 * STUB — any server that speaks the OpenAI Chat Completions API:
 * OpenRouter (https://openrouter.ai/api/v1), Groq (https://api.groq.com/openai/v1),
 * Ollama (http://localhost:11434/v1), LM Studio, etc.
 *
 * To finish it (plain fetch, no SDK needed):
 *
 * 1. POST `${AI_BASE_URL}/chat/completions` with
 *    `Authorization: Bearer ${AI_API_KEY}` (skip the header when the key is
 *    empty, e.g. for Ollama) and a body of
 *    `{ model, temperature, messages: [{ role: "system", content: system },
 *      { role: "user", content: prompt }],
 *      response_format: { type: "json_schema",
 *        json_schema: { name: "result", schema: jsonSchema, strict: true } } }`.
 *    Some servers only support `response_format: { type: "json_object" }`; in
 *    that case append the schema to the system prompt.
 * 2. Return `choices[0].message.content`.
 * 3. Map errors to AiError like gemini.ts does: 429 → "rate_limit" (read
 *    `retry-after`), 401/403 → "auth", 404 → "config", others → "provider".
 *    Use `signal: AbortSignal.timeout(request.timeoutMs ?? 90_000)`.
 */
async function generateJSON(request: JsonRequest): Promise<string> {
  const baseUrl = process.env.AI_BASE_URL?.trim();
  if (!baseUrl) {
    throw new AiError(
      "missing_key",
      'AI_BASE_URL isn\'t set. Add it to .env.local (AI_PROVIDER is "openai-compatible"), e.g. https://openrouter.ai/api/v1.',
    );
  }
  throw new AiError(
    "config",
    `The openai-compatible adapter isn't finished yet (model "${request.model}"). Set AI_PROVIDER=gemini for now.`,
  );
}

export const openaiCompatible: ProviderAdapter = {
  name: "openai-compatible",
  // No sensible universal default: each server has its own model names.
  defaultModel: "",
  generateJSON,
};
