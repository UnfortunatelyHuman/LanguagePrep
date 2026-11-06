import "server-only";
import { z } from "zod";
import { aiFallbackProviders, aiModels, aiProvider } from "./config";
import { AiError } from "./errors";
import { anthropic } from "./providers/anthropic";
import { gemini } from "./providers/gemini";
import { mock } from "./providers/mock";
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
  mock,
};

/** Pause before retrying the last model when every model is overloaded. */
const OVERLOAD_PAUSE_MS = 3000;
/**
 * A model with fallbacks behind it gets less time: an overloaded model can
 * hang for minutes, and the next one usually answers in well under a minute.
 * Calls that ask for longer (a whole lesson) keep their own timeout.
 */
const FALLBACK_TIMEOUT_MS = 60_000;
/** Ceiling for one generateJSON call, fallbacks and corrective retry included. */
const TOTAL_TIMEOUT_MS = 180_000;
/** Don't start a call (or the corrective retry) with less time than this left. */
const MIN_CALL_MS = 15_000;

function outOfTime(): AiError {
  return new AiError("provider", "The AI took too long overall (over 3 minutes). Try again in a moment.", {
    modelProblem: "timeout",
  });
}

type Step = { provider: AiProviderName; models: string[] };

/**
 * Providers to try, in order, each with its models: the main one (AI_PROVIDER
 * + AI_MODEL), then any in AI_FALLBACK_PROVIDERS with AI_FALLBACK_MODEL.
 */
export function activeChain(): Step[] {
  const primary = aiProvider();
  // The mock ignores AI_MODEL, so rows written in tests never name a real model.
  const models = primary === "mock" ? mock.defaultModels : aiModels("AI_MODEL", ADAPTERS[primary].defaultModels);
  const steps: Step[] = [{ provider: primary, models }];
  if (!steps[0].models.length) {
    throw new AiError("config", `AI_MODEL isn't set. The ${primary} provider needs a model name in .env.local.`);
  }
  for (const provider of aiFallbackProviders(primary)) {
    const models = aiModels("AI_FALLBACK_MODEL", ADAPTERS[provider].defaultModels);
    if (!models.length) {
      throw new AiError(
        "config",
        `AI_FALLBACK_MODEL isn't set. The ${provider} fallback provider needs a model name in .env.local.`,
      );
    }
    steps.push({ provider, models });
  }
  return steps;
}

/**
 * Hand over to the next provider only when the whole main list is out of
 * quota or overloaded (or timing out); bad keys and config errors don't move on.
 */
function shouldFallBack(error: AiError): boolean {
  return (
    error.kind === "rate_limit" ||
    error.modelProblem === "rate_limited" ||
    error.modelProblem === "overloaded" ||
    error.modelProblem === "timeout" ||
    // Every main model refused the request (e.g. its schema): another provider may accept it.
    error.modelProblem === "rejected"
  );
}

/**
 * Call the adapter with each model in turn. A model that is overloaded, slow,
 * out of quota or retired hands over to the next one; if the last one is overloaded, wait a
 * moment and give it one more try. Any other error stops immediately.
 */
async function callWithFallback(
  adapter: ProviderAdapter,
  models: string[],
  request: Omit<JsonRequest, "model">,
  deadline: number,
): Promise<{ text: string; model: string }> {
  const problems: string[] = [];
  /** This call's timeout: its own limit, capped by what's left of the overall deadline. */
  const budget = (limit: number | undefined) => {
    const left = deadline - Date.now();
    if (left < MIN_CALL_MS) throw outOfTime();
    return Math.min(limit ?? left, left);
  };
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const isLast = i === models.length - 1;
    const started = Date.now();
    const timeoutMs = budget(
      isLast || (request.timeoutMs ?? 0) > FALLBACK_TIMEOUT_MS
        ? request.timeoutMs
        : Math.min(request.timeoutMs ?? FALLBACK_TIMEOUT_MS, FALLBACK_TIMEOUT_MS),
    );
    try {
      return { text: await adapter.generateJSON({ ...request, model, timeoutMs }), model };
    } catch (caught) {
      if (!(caught instanceof AiError) || !caught.modelProblem) throw caught;
      let error = caught;
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
          return { text: await adapter.generateJSON({ ...request, model, timeoutMs: budget(request.timeoutMs) }), model };
        } catch (retryError) {
          if (!(retryError instanceof AiError) || !retryError.modelProblem) throw retryError;
          // Report what the retry ran into (it may now be a rate limit with a wait time).
          error = retryError;
        }
      }
      if (models.length === 1) throw error;
      if (error.modelProblem === "rate_limited") {
        // Keep the rate-limit kind and wait time so the UI can say how long to wait.
        throw new AiError(
          "rate_limit",
          `Every ${adapter.name} model is busy or out of quota (${problems.join(", ")}). ${error.message}`,
          { cause: error, retryAfterSeconds: error.retryAfterSeconds, modelProblem: "rate_limited" },
        );
      }
      throw new AiError(
        error.modelProblem === "unavailable" ? "config" : "provider",
        `None of the ${adapter.name} models could answer: ${problems.join(", ")}. ` +
          (error.modelProblem === "unavailable"
            ? "Check the model names in .env.local and restart the dev server."
            : error.modelProblem === "rejected"
              ? error.message
              : "Try again in a moment."),
        { cause: error, modelProblem: error.modelProblem },
      );
    }
  }
  throw new AiError("config", `No models are configured for ${adapter.name}.`);
}

/** Models occasionally wrap JSON in a ```json fence despite JSON mode. */
function parseJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(trimmed);
}

export type JsonOptions = GenerateOptions & {
  /** Told which model actually answered (after any fallback). */
  onModel?: (model: string) => void;
  /**
   * With AI_PROVIDER=mock, this answer is returned instead of the mock's
   * schema-driven filler. For replies whose parts must agree with each other
   * (an exercise's answer and its options). Real providers ignore it.
   */
  mockFixture?: () => unknown;
};

/**
 * Try each provider in the chain in turn (each with its own model list), from
 * `start`. Moves on only when a provider is out of quota or overloaded.
 */
async function callChain(
  chain: Step[],
  start: { step: number; model: number },
  request: Omit<JsonRequest, "model">,
  deadline: number,
): Promise<{ text: string; model: string; step: number }> {
  let firstError: AiError | null = null;
  for (let step = start.step; step < chain.length; step++) {
    const { provider, models } = chain[step];
    const from = step === start.step ? start.model : 0;
    try {
      const { text, model } = await callWithFallback(ADAPTERS[provider], models.slice(from), request, deadline);
      return { text, model, step };
    } catch (caught) {
      if (!(caught instanceof AiError)) throw caught;
      if (firstError) {
        // A fallback failed too: say both, keep the main provider's kind (and wait time).
        throw new AiError(
          firstError.kind,
          `${firstError.message} The fallback (${provider}) didn't work either: ${caught.message}`,
          { cause: caught, retryAfterSeconds: firstError.retryAfterSeconds, modelProblem: firstError.modelProblem },
        );
      }
      const next = chain[step + 1];
      if (!next || !shouldFallBack(caught)) throw caught;
      firstError = caught;
      console.warn(`[ai] ${provider}: ${caught.modelProblem ?? caught.kind}; falling back to ${next.provider}`);
    }
  }
  throw firstError ?? new AiError("config", "No AI provider is configured.");
}

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
  const chain = activeChain();
  // Long calls (a whole lesson) get room for a second model after a slow first one.
  const deadline = Date.now() + Math.max(TOTAL_TIMEOUT_MS, (options.timeoutMs ?? 0) * 2 + 30_000);
  const jsonSchema = z.toJSONSchema(schema, { io: "output", unrepresentable: "any" }) as Record<
    string,
    unknown
  >;

  let start = { step: 0, model: 0 };
  let lastProblem = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0 && deadline - Date.now() < MIN_CALL_MS) break;
    const fullPrompt = lastProblem
      ? `${prompt}\n\nYour previous answer was rejected: ${lastProblem}\nReply again with JSON that matches the schema exactly.`
      : prompt;
    const { text, model, step } = await callChain(chain, start, { ...options, prompt: fullPrompt, jsonSchema }, deadline);
    // A corrective retry starts from the provider and model that just answered.
    start = { step, model: chain[step].models.indexOf(model) };

    let data: unknown;
    try {
      data = parseJson(text);
    } catch {
      lastProblem = "it was not valid JSON.";
      continue;
    }
    const result = schema.safeParse(data);
    if (result.success) {
      onModel?.(step === 0 ? model : `${chain[step].provider}:${model}`);
      return result.data;
    }
    lastProblem = z.prettifyError(result.error).slice(0, 1500);
  }

  throw new AiError(
    "invalid_response",
    "The AI's answer didn't have the expected format, twice in a row. Try again.",
  );
}
