import { AiError } from "../errors";
import type { JsonRequest, ProviderAdapter } from "../types";

/**
 * Any server that speaks the OpenAI Chat Completions API, with plain fetch:
 * OpenRouter (https://openrouter.ai/api/v1), Groq (https://api.groq.com/openai/v1),
 * Ollama (http://localhost:11434/v1), LM Studio, OpenAI itself…
 *
 * Asks for structured output (`response_format: json_schema`). Servers or
 * models that don't support it get `json_object` mode with the schema in the
 * system prompt instead; that choice is remembered per base URL and model.
 */

type Mode = "json_schema" | "json_object";

/** "baseUrl|model" → the JSON mode that server accepted (or that we fell back to). */
const modes = new Map<string, Mode>();

type ChatResponse = {
  choices?: { message?: { content?: string | null; refusal?: string | null }; finish_reason?: string }[];
  error?: { message?: string } | string;
};

function settings() {
  const baseUrl = process.env.AI_BASE_URL?.trim().replace(/\/+$/, "");
  if (!baseUrl) {
    throw new AiError(
      "missing_key",
      'AI_BASE_URL isn\'t set. Add it to .env.local for the openai-compatible provider, e.g. https://openrouter.ai/api/v1 (Ollama: http://localhost:11434/v1), and restart the dev server.',
    );
  }
  const apiKey = process.env.AI_API_KEY?.trim();
  return { baseUrl, apiKey: apiKey && apiKey !== "PASTE_KEY_HERE" ? apiKey : undefined };
}

/** The server's own error text, without anything that could be a secret. */
function serverMessage(body: ChatResponse | null, raw: string): string {
  const message = typeof body?.error === "string" ? body.error : body?.error?.message;
  return (message ?? raw).replace(/(sk|gsk|or)-[\w-]{8,}/g, "[key]").slice(0, 300);
}

/** Seconds from `retry-after` (seconds or an HTTP date). */
function retryAfter(headers: Headers): number | undefined {
  const value = headers.get("retry-after");
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(1, Math.ceil(seconds));
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(1, Math.ceil((date - Date.now()) / 1000));
}

function host(baseUrl: string): string {
  try {
    return new URL(baseUrl).host;
  } catch {
    return baseUrl;
  }
}

/** Does a 400/422 complain about the response_format we sent? */
const isFormatComplaint = (message: string) => /response_format|json_schema|structured|schema/i.test(message);

function httpError(status: number, message: string, headers: Headers, model: string, where: string): AiError {
  if (status === 429) {
    const wait = retryAfter(headers);
    return new AiError(
      "rate_limit",
      `${where} rate limit or quota for "${model}" was reached. ${wait ? `Try again in about ${wait} s.` : "Wait a minute and try again."}`,
      { retryAfterSeconds: wait, modelProblem: "rate_limited" },
    );
  }
  if (status === 401 || status === 403) {
    return new AiError(
      "auth",
      `${where} rejected AI_API_KEY (HTTP ${status}). Check the key in .env.local and restart the dev server.`,
    );
  }
  if (status === 404) {
    return new AiError(
      "config",
      `${where} doesn't know the model "${model}" (or AI_BASE_URL is wrong). Check AI_FALLBACK_MODEL / AI_MODEL and AI_BASE_URL in .env.local.`,
      { modelProblem: "unavailable" },
    );
  }
  if (status === 502 || status === 503 || status === 529 || /overloaded|capacity|unavailable/i.test(message)) {
    return new AiError("provider", `${where} "${model}" is overloaded right now. Try again in a moment.`, {
      modelProblem: "overloaded",
    });
  }
  return new AiError(
    "provider",
    status >= 500
      ? `${where} is having trouble right now (HTTP ${status}). Try again in a moment.`
      : `${where} returned an error (HTTP ${status}): ${message}`,
  );
}

async function send(request: JsonRequest, mode: Mode, signal: AbortSignal) {
  const { baseUrl, apiKey } = settings();
  const schemaNote =
    mode === "json_object"
      ? `\n\nReply with a single JSON object that matches this JSON Schema exactly, and nothing else:\n${JSON.stringify(request.jsonSchema)}`
      : "";
  const system = `${request.system ?? ""}${schemaNote}`.trim();

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: request.model,
      ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        { role: "user", content: request.prompt },
      ],
      response_format:
        mode === "json_schema"
          ? { type: "json_schema", json_schema: { name: "result", schema: request.jsonSchema, strict: false } }
          : { type: "json_object" },
    }),
    signal,
  });
  const raw = await response.text();
  let body: ChatResponse | null = null;
  try {
    body = JSON.parse(raw) as ChatResponse;
  } catch {
    // Non-JSON error pages are reported by status below.
  }
  return { response, raw, body };
}

async function generateJSON(request: JsonRequest): Promise<string> {
  const { baseUrl } = settings();
  const where = host(baseUrl);
  const key = `${baseUrl}|${request.model}`;
  const signal = AbortSignal.timeout(request.timeoutMs ?? 90_000);

  try {
    let mode: Mode = modes.get(key) ?? "json_schema";
    let { response, raw, body } = await send(request, mode, signal);

    // Structured output not supported here: fall back to JSON mode once, and remember.
    if ((response.status === 400 || response.status === 422) && mode === "json_schema" && isFormatComplaint(serverMessage(body, raw))) {
      mode = "json_object";
      console.warn(`[ai] ${where} ${request.model}: json_schema not supported; using json_object mode`);
      ({ response, raw, body } = await send(request, mode, signal));
    }
    if (!response.ok) {
      throw httpError(response.status, serverMessage(body, raw), response.headers, request.model, where);
    }
    modes.set(key, mode);

    // Some servers answer 200 with an error object (OpenRouter upstream failures).
    if (body?.error) throw httpError(502, serverMessage(body, raw), response.headers, request.model, where);
    const choice = body?.choices?.[0];
    if (choice?.message?.refusal) {
      throw new AiError("provider", `${where} "${request.model}" refused the request.`);
    }
    if (choice?.finish_reason === "length") {
      throw new AiError("invalid_response", `${where} "${request.model}" was cut off before it finished.`, {
        modelProblem: "truncated",
      });
    }
    // Reasoning models served this way may prefix their thoughts.
    const text = choice?.message?.content?.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    if (!text) throw new AiError("invalid_response", `${where} "${request.model}" returned an empty answer.`);
    return text;
  } catch (error) {
    if (error instanceof AiError) throw error;
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new AiError("provider", `${where} "${request.model}" took too long to answer. Try again.`, {
        cause: error,
        modelProblem: "timeout",
      });
    }
    throw new AiError(
      "provider",
      `Couldn't reach ${where}. Check AI_BASE_URL and your connection (is the server running?).`,
      { cause: error },
    );
  }
}

export const openaiCompatible: ProviderAdapter = {
  name: "openai-compatible",
  // No universal default: each server has its own model names.
  defaultModels: [],
  generateJSON,
};
