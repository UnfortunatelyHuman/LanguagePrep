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

/** Recursively keep only the keywords Gemini understands (zod emits a few more). */
function toGeminiSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toGeminiSchema);
  if (!node || typeof node !== "object") return node;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (!SUPPORTED_KEYWORDS.has(key)) continue;
    if (key === "properties" || key === "$defs") {
      out[key] = Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, toGeminiSchema(v)]),
      );
    } else if (key === "additionalProperties" && typeof value === "boolean") {
      // Gemini rejects `additionalProperties: false`; zod still validates strictly.
      continue;
    } else {
      out[key] = toGeminiSchema(value);
    }
  }
  return out;
}

/** Gemini puts "retryDelay": "37s" in the body of a 429. */
function retryDelaySeconds(message: string): number | undefined {
  const match = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(message);
  return match ? Math.ceil(Number(match[1])) : undefined;
}

function toAiError(error: unknown, model: string): AiError {
  if (error instanceof AiError) return error;
  if (error instanceof ApiError) {
    const { status, message } = error;
    if (status === 429 || /RESOURCE_EXHAUSTED/.test(message)) {
      const wait = retryDelaySeconds(message);
      return new AiError(
        "rate_limit",
        `Gemini's rate limit or quota was reached.${wait ? ` Try again in about ${wait} s.` : " Wait a minute and try again."}`,
        { cause: error, retryAfterSeconds: wait },
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

  try {
    const response = await ai.models.generateContent({
      model: request.model,
      contents: request.prompt,
      config: {
        systemInstruction: request.system,
        temperature: request.temperature,
        responseMimeType: "application/json",
        responseJsonSchema: toGeminiSchema(request.jsonSchema),
        // Thinking tokens count against this, so leave room.
        maxOutputTokens: 16384,
        abortSignal: AbortSignal.timeout(request.timeoutMs ?? 90_000),
      },
    });

    const blocked = response.promptFeedback?.blockReason;
    if (blocked) {
      throw new AiError("provider", `Gemini refused the request (${blocked}).`);
    }
    const finish = response.candidates?.[0]?.finishReason;
    if (finish === "MAX_TOKENS") {
      throw new AiError("invalid_response", "Gemini's answer was cut off before it finished.");
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

export const gemini: ProviderAdapter = {
  name: "gemini",
  defaultModel: "gemini-3.5-flash",
  generateJSON,
};
