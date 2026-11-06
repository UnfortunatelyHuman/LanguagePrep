import { ApiError, GoogleGenAI } from "@google/genai";
import { requireEnv } from "../config";
import { AiError } from "../errors";
import type { JsonRequest, ProviderAdapter } from "../types";

/** JSON Schema keywords Gemini's responseJsonSchema accepts; others are dropped. */
const SUPPORTED_KEYWORDS = new Set([
  "$id", "$defs", "$ref", "$anchor", "type", "format", "title", "description",
  "enum", "items", "prefixItems", "minItems", "maxItems", "minimum", "maximum",
  "anyOf", "oneOf", "properties", "additionalProperties", "required",
  "propertyOrdering",
]);

const LIMIT_KEYWORDS = ["minItems", "maxItems", "minimum", "maximum"] as const;

/** "Between 8 and 10 items." / "At most 3 items." / "From 0 to 20." for a node's limits. */
function limitsText(node: Record<string, unknown>): string {
  const [minI, maxI, min, max] = LIMIT_KEYWORDS.map((k) => node[k] as number | undefined);
  const range = (lo: number | undefined, hi: number | undefined, unit: string) =>
    lo !== undefined && hi !== undefined
      ? lo === hi
        ? `Exactly ${lo}${unit}.`
        : `Between ${lo} and ${hi}${unit}.`
      : lo !== undefined
        ? `At least ${lo}${unit}.`
        : hi !== undefined
          ? `At most ${hi}${unit}.`
          : "";
  return [range(minI, maxI, " items"), range(min, max, "")].filter(Boolean).join(" ");
}

/**
 * Recursively keep only the keywords Gemini understands (zod emits a few more).
 * With `relaxed`, size and range limits move into the descriptions instead:
 * Gemini rejects large schemas with many limits ("invalid argument"), and zod
 * still enforces them on the answer.
 */
export function toGeminiSchema(node: unknown, relaxed = false): unknown {
  if (Array.isArray(node)) return node.map((n) => toGeminiSchema(n, relaxed));
  if (!node || typeof node !== "object") return node;
  const source = node as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (!SUPPORTED_KEYWORDS.has(key)) continue;
    if (relaxed && (LIMIT_KEYWORDS as readonly string[]).includes(key)) continue;
    if (key === "properties" || key === "$defs") {
      out[key] = Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, toGeminiSchema(v, relaxed)]),
      );
    } else if (key === "additionalProperties" && typeof value === "boolean") {
      // Gemini rejects `additionalProperties: false`; zod still validates strictly.
      continue;
    } else {
      out[key] = toGeminiSchema(value, relaxed);
    }
  }
  if (relaxed) {
    const limits = limitsText(source);
    if (limits) {
      const own = typeof source.description === "string" ? source.description.trim().replace(/([^.!?])$/, "$1.") : "";
      out.description = [own, limits].filter(Boolean).join(" ");
    }
  }
  return out;
}

/** Schemas each model rejected with their limits ("model|schema"): sent relaxed from then on. */
const relaxedSchemas = new Set<string>();

const hasLimits = (schema: unknown) => /"(minItems|maxItems|minimum|maximum)"/.test(JSON.stringify(schema));

/** Gemini puts "retryDelay": "37s" in the body of a 429. */
function retryDelaySeconds(message: string): number | undefined {
  const match = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(message);
  return match ? Math.ceil(Number(match[1])) : undefined;
}

/** "Try again in about 40 s" / "about 56 minutes", or a generic hint. */
function waitText(seconds: number | undefined): string {
  if (!seconds) return "Wait a minute and try again.";
  if (seconds < 120) return `Try again in about ${seconds} s.`;
  return `Try again in about ${Math.ceil(seconds / 60)} minutes (free-tier daily or hourly quota).`;
}

function toAiError(error: unknown, model: string): AiError {
  if (error instanceof AiError) return error;
  if (error instanceof ApiError) {
    const { status, message } = error;
    if (status === 429 || /RESOURCE_EXHAUSTED/.test(message)) {
      const wait = retryDelaySeconds(message);
      return new AiError(
        "rate_limit",
        `Gemini's rate limit or quota for "${model}" was reached. ${waitText(wait)}`,
        { cause: error, retryAfterSeconds: wait, modelProblem: "rate_limited" },
      );
    }
    if (status === 401 || status === 403 || /API key not valid|API_KEY_INVALID/i.test(message)) {
      return new AiError(
        "auth",
        "Gemini rejected GEMINI_API_KEY. Check the key in .env.local (or create a new one in Google AI Studio) and restart the dev server.",
        { cause: error },
      );
    }
    if (status === 404) {
      // Retired models answer 404 and name their replacement ("use models/…").
      const replacement = /use models\/([\w.-]+)/.exec(message)?.[1];
      return new AiError(
        "config",
        `Gemini can't use the model "${model}"${replacement ? `; Google suggests "${replacement}"` : ""}. Update AI_MODEL in .env.local and restart the dev server.`,
        { cause: error, modelProblem: "unavailable" },
      );
    }
    if (status === 503 || /UNAVAILABLE|high demand|overloaded/i.test(message)) {
      return new AiError(
        "provider",
        `Gemini's "${model}" model is overloaded right now. Try again in a moment.`,
        { cause: error, modelProblem: "overloaded" },
      );
    }
    if (status === 400) {
      // Usually the response schema is too complex for this model; another model may accept it.
      const detail = (/"message":\s*"([^"]{1,200})"/.exec(message)?.[1] ?? message.slice(0, 200)).replace(/AIza[\w-]+/g, "[key]");
      return new AiError("provider", `Gemini's "${model}" model rejected the request (HTTP 400: ${detail}).`, {
        cause: error,
        modelProblem: "rejected",
      });
    }
    return new AiError(
      "provider",
      status >= 500
        ? "Gemini is having trouble right now (server error). Try again in a moment."
        : `Gemini returned an error (HTTP ${status}).`,
      { cause: error },
    );
  }
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return new AiError("provider", `Gemini's "${model}" model took too long to answer. Try again.`, {
      cause: error,
      modelProblem: "timeout",
    });
  }
  return new AiError(
    "provider",
    "Couldn't reach Gemini. Check your internet connection and try again.",
    { cause: error },
  );
}

async function generateJSON(request: JsonRequest): Promise<string> {
  const apiKey = requireEnv("GEMINI_API_KEY", "gemini");
  const ai = new GoogleGenAI({ apiKey });
  const key = `${request.model}|${JSON.stringify(request.jsonSchema)}`;
  const signal = AbortSignal.timeout(request.timeoutMs ?? 90_000);
  const send = (relaxed: boolean) =>
    ai.models.generateContent({
      model: request.model,
      contents: request.prompt,
      config: {
        systemInstruction: request.system,
        temperature: request.temperature,
        responseMimeType: "application/json",
        responseJsonSchema: toGeminiSchema(request.jsonSchema, relaxed),
        // Thinking tokens count against this, so leave room.
        maxOutputTokens: 16384,
        abortSignal: signal,
      },
    });

  try {
    let response;
    try {
      response = await send(relaxedSchemas.has(key));
    } catch (error) {
      // Too many limits for this model: send them as descriptions instead, once, and remember.
      if (!(error instanceof ApiError) || error.status !== 400 || relaxedSchemas.has(key) || !hasLimits(request.jsonSchema)) {
        throw error;
      }
      console.warn(`[ai] ${request.model}: schema rejected; retrying with its limits as descriptions`);
      relaxedSchemas.add(key);
      response = await send(true);
    }

    const blocked = response.promptFeedback?.blockReason;
    if (blocked) {
      throw new AiError("provider", `Gemini refused the request (${blocked}).`);
    }
    const finish = response.candidates?.[0]?.finishReason;
    if (finish === "MAX_TOKENS") {
      throw new AiError("invalid_response", "Gemini's answer was cut off before it finished.", {
        modelProblem: "truncated",
      });
    }
    if (finish && finish !== "STOP") {
      throw new AiError("provider", `Gemini stopped early (${finish}).`);
    }
    const text = response.text;
    if (!text) throw new AiError("invalid_response", "Gemini returned an empty answer.");
    return text;
  } catch (error) {
    throw toAiError(error, request.model);
  }
}

/**
 * Tried in order when AI_MODEL is empty. On the free tier each model has its
 * own daily quota, so a long list keeps working after the first ones run out;
 * the Flash-Lite models come last (cheaper, a little weaker at grading).
 */
const DEFAULT_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash-lite",
];

export const gemini: ProviderAdapter = {
  name: "gemini",
  defaultModels: DEFAULT_MODELS,
  generateJSON,
};
