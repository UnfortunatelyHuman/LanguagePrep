import "server-only";
import { z } from "zod";
import { aiModels, aiProvider } from "./config";
import { AiError } from "./errors";
import { anthropic } from "./providers/anthropic";
import { gemini } from "./providers/gemini";
import { openaiCompatible } from "./providers/openai-compatible";
import type { AiProviderName, GenerateOptions, JsonRequest, ProviderAdapter } from "./types";

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

/** Pause before retrying the last model when every model is overloaded. */
const OVERLOAD_PAUSE_MS = 3000;
/**
 * A model with fallbacks behind it gets less time: an overloaded model can
 * hang for minutes, and the next one usually answers in well under a minute.
 */
const FALLBACK_TIMEOUT_MS = 60_000;

/** Provider in use and the models to try, in order. */
export function activeModels(): { provider: AiProviderName; models: string[] } {
  const adapter = ADAPTERS[aiProvider()];
  const models = aiModels(adapter.defaultModel);
  if (!models.length) {
    throw new AiError(
      "config",
      `AI_MODEL isn't set. The ${adapter.name} provider needs a model name in .env.local.`,
    );
  }
  return { provider: adapter.name, models };
}

/**
 * Call the adapter with each model in turn. A model that is overloaded, slow
 * or retired hands over to the next one; if the last one is overloaded, wait a
 * moment and give it one more try. Any other error stops immediately.
 */
async function callWithFallback(
  adapter: ProviderAdapter,
  models: string[],
  request: Omit<JsonRequest, "model">,
): Promise<{ text: string; model: string }> {
  const problems: string[] = [];
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const isLast = i === models.length - 1;
    const started = Date.now();
    const timeoutMs = isLast
      ? request.timeoutMs
      : Math.min(request.timeoutMs ?? FALLBACK_TIMEOUT_MS, FALLBACK_TIMEOUT_MS);
    try {
      return { text: await adapter.generateJSON({ ...request, model, timeoutMs }), model };
    } catch (error) {
      if (!(error instanceof AiError) || !error.modelProblem) throw error;
      problems.push(`${model} (${error.modelProblem})`);

      if (!isLast) {
        const seconds = ((Date.now() - started) / 1000).toFixed(1);
        console.warn(
          `[ai] ${model}: ${error.modelProblem} after ${seconds} s; falling back to ${models[i + 1]}`,
        );
        continue;
      }
      if (error.modelProblem === "overloaded") {
        await new Promise((resolve) => setTimeout(resolve, OVERLOAD_PAUSE_MS));
        try {
          return { text: await adapter.generateJSON({ ...request, model }), model };
        } catch (retryError) {
          if (!(retryError instanceof AiError) || !retryError.modelProblem) throw retryError;
        }
      }
      if (models.length === 1) throw error;
      throw new AiError(
        error.modelProblem === "unavailable" ? "config" : "provider",
        `None of the models in AI_MODEL could answer: ${problems.join(", ")}. ` +
          (error.modelProblem === "unavailable"
            ? "Check AI_MODEL in .env.local and restart the dev server."
            : "Try again in a moment."),
        { cause: error },
      );
    }
  }
  throw new AiError("config", "AI_MODEL lists no models.");
}

/** Models occasionally wrap JSON in a ```json fence despite JSON mode. */
function parseJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(trimmed);
}

export type JsonOptions = GenerateOptions & {
  /** Told which model actually answered (after any fallback). */
  onModel?: (model: string) => void;
};

/**
 * Ask the configured model(s) for JSON matching `schema`, and return it parsed
 * and validated. If the reply doesn't parse or validate, ask once more, telling
 * the model what was wrong. Throws AiError for every failure.
 */
export async function generateJSON<T extends z.ZodType>(
  prompt: string,
  schema: T,
  { onModel, ...options }: JsonOptions = {},
): Promise<z.output<T>> {
  const { provider, models } = activeModels();
  const adapter = ADAPTERS[provider];
  const jsonSchema = z.toJSONSchema(schema, { io: "output", unrepresentable: "any" }) as Record<
    string,
    unknown
  >;

  let candidates = models;
  let lastProblem = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const fullPrompt = lastProblem
      ? `${prompt}\n\nYour previous answer was rejected: ${lastProblem}\nReply again with JSON that matches the schema exactly.`
      : prompt;
    const { text, model } = await callWithFallback(adapter, candidates, {
      ...options,
      prompt: fullPrompt,
      jsonSchema,
    });
    // A corrective retry starts from the model that just answered.
    candidates = models.slice(models.indexOf(model));

    let data: unknown;
    try {
      data = parseJson(text);
    } catch {
      lastProblem = "it was not valid JSON.";
      continue;
    }
    const result = schema.safeParse(data);
    if (result.success) {
      onModel?.(model);
      return result.data;
    }
    lastProblem = z.prettifyError(result.error).slice(0, 1500);
  }

  throw new AiError(
    "invalid_response",
    "The AI's answer didn't have the expected format, twice in a row. Try again.",
  );
}
