import "server-only";
import { z } from "zod";
import { aiModel, aiProvider } from "./config";
import { AiError } from "./errors";
import { anthropic } from "./providers/anthropic";
import { gemini } from "./providers/gemini";
import { openaiCompatible } from "./providers/openai-compatible";
import type { AiProviderName, GenerateOptions, ProviderAdapter } from "./types";

/**
 * The only entry point app code uses for AI. Provider SDKs are imported by the
 * adapters in ./providers and nowhere else.
 */

export { AiError, isAiError, type AiErrorKind } from "./errors";
export type { GenerateOptions } from "./types";

const ADAPTERS: Record<AiProviderName, ProviderAdapter> = {
  gemini,
  anthropic,
  "openai-compatible": openaiCompatible,
};

/** Provider and model in use, e.g. for showing "graded by gemini-2.5-flash". */
export function activeModel(): { provider: AiProviderName; model: string } {
  const adapter = ADAPTERS[aiProvider()];
  const model = aiModel(adapter.defaultModel);
  if (!model) {
    throw new AiError(
      "config",
      `AI_MODEL isn't set. The ${adapter.name} provider needs a model name in .env.local.`,
    );
  }
  return { provider: adapter.name, model };
}

/** Models occasionally wrap JSON in a ```json fence despite JSON mode. */
function parseJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(trimmed);
}

/**
 * Ask the configured model for JSON matching `schema`, and return it parsed and
 * validated. If the reply doesn't parse or validate, ask once more, telling the
 * model what was wrong. Throws AiError for every failure.
 */
export async function generateJSON<T extends z.ZodType>(
  prompt: string,
  schema: T,
  options: GenerateOptions = {},
): Promise<z.output<T>> {
  const { provider, model } = activeModel();
  const adapter = ADAPTERS[provider];
  const jsonSchema = z.toJSONSchema(schema, { io: "output", unrepresentable: "any" }) as Record<
    string,
    unknown
  >;

  let lastProblem = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const fullPrompt = lastProblem
      ? `${prompt}\n\nYour previous answer was rejected: ${lastProblem}\nReply again with JSON that matches the schema exactly.`
      : prompt;
    const text = await adapter.generateJSON({ ...options, model, prompt: fullPrompt, jsonSchema });

    let data: unknown;
    try {
      data = parseJson(text);
    } catch {
      lastProblem = "it was not valid JSON.";
      continue;
    }
    const result = schema.safeParse(data);
    if (result.success) return result.data;
    lastProblem = z.prettifyError(result.error).slice(0, 1500);
  }

  throw new AiError(
    "invalid_response",
    "The AI's answer didn't have the expected format, twice in a row. Try again.",
  );
}
