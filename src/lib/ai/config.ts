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

export function aiModel(fallback: string): string {
  return process.env.AI_MODEL?.trim() || fallback;
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
