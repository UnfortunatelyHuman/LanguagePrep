import { requireEnv } from "../config";
import { AiError } from "../errors";
import type { JsonRequest, ProviderAdapter } from "../types";

/**
 * STUB — not wired up yet. To finish it:
 *
 * 1. `npm install @anthropic-ai/sdk` (only this file may import it).
 * 2. Create `new Anthropic({ apiKey })` and call `client.messages.create` with
 *    `model: request.model`, `system: request.system`, `max_tokens: 8192`,
 *    `temperature: request.temperature`, and the prompt as one user message.
 * 3. Ask for JSON via structured outputs (`output_config.format` of type
 *    "json_schema" with `request.jsonSchema`) or a single forced tool whose
 *    `input_schema` is `request.jsonSchema`; return the JSON as a string.
 * 4. Map errors to AiError like gemini.ts does: 429 → "rate_limit" (read the
 *    `retry-after` header), 401/403 → "auth", 404 → "config", others → "provider".
 *    Pass `{ signal: AbortSignal.timeout(request.timeoutMs ?? 90_000) }`.
 */
async function generateJSON(request: JsonRequest): Promise<string> {
  requireEnv("ANTHROPIC_API_KEY", "anthropic");
  throw new AiError(
    "config",
    `The anthropic adapter isn't finished yet (model "${request.model}"). Set AI_PROVIDER=gemini for now.`,
  );
}

export const anthropic: ProviderAdapter = {
  name: "anthropic",
  defaultModel: "claude-sonnet-5-5",
  generateJSON,
};
