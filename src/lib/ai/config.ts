import { AiError } from "./errors";
import { AI_PROVIDERS, type AiProviderName } from "./types";

/** Which provider and model to use, from AI_PROVIDER and AI_MODEL. */
export function aiProvider(): AiProviderName {
  const raw = (process.env.AI_PROVIDER ?? "").trim().toLowerCase();
  if (!raw) return "gemini";
  if ((AI_PROVIDERS as readonly string[]).includes(raw)) return raw as AiProviderName;
  throw new AiError(
    "config",
    `AI_PROVIDER="${raw}" isn't supported. Use one of: ${AI_PROVIDERS.join(", ")}.`,
  );
}

/**
 * Models to try, in order. AI_MODEL may be one name or a comma-separated
 * list ("gemini-3.8-flash,gemini-3.5-flash"); later ones are fallbacks.
 */
export function aiModels(fallback: string): string[] {
  const list = (process.env.AI_MODEL ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  const models = list.length ? list : [fallback].filter(Boolean);
  return [...new Set(models)];
}

/** Read a required secret, or explain exactly which variable to set. */
export function requireEnv(name: string, provider: AiProviderName): string {
  const value = process.env[name]?.trim();
  if (!value || value === "PASTE_KEY_HERE") {
    throw new AiError(
      "missing_key",
      `${name} isn't set. Add it to .env.local (AI_PROVIDER is "${provider}") and restart the dev server.`,
    );
  }
  return value;
}
