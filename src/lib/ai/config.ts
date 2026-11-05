import { AiError } from "./errors";
import { AI_PROVIDERS, type AiProviderName } from "./types";

function providerName(raw: string, variable: string): AiProviderName {
  const name = raw.trim().toLowerCase();
  if ((AI_PROVIDERS as readonly string[]).includes(name)) return name as AiProviderName;
  throw new AiError("config", `${variable}="${name}" isn't supported. Use one of: ${AI_PROVIDERS.join(", ")}.`);
}

/** The main provider, from AI_PROVIDER (default gemini). */
export function aiProvider(): AiProviderName {
  const raw = (process.env.AI_PROVIDER ?? "").trim();
  return raw ? providerName(raw, "AI_PROVIDER") : "gemini";
}

/**
 * Providers to fall back to, in order, when every model of the main provider
 * is out of quota or overloaded: AI_FALLBACK_PROVIDERS="openai-compatible".
 */
export function aiFallbackProviders(primary: AiProviderName): AiProviderName[] {
  const names = (process.env.AI_FALLBACK_PROVIDERS ?? "")
    .split(",")
    .filter((n) => n.trim())
    .map((n) => providerName(n, "AI_FALLBACK_PROVIDERS"));
  return [...new Set(names)].filter((n) => n !== primary);
}

function list(value: string | undefined): string[] {
  return [...new Set((value ?? "").split(",").map((m) => m.trim()).filter(Boolean))];
}

/**
 * Models to try, in order. The variable (AI_MODEL for the main provider,
 * AI_FALLBACK_MODEL for fallback providers) may hold one name or a
 * comma-separated list; when it's empty the adapter's defaults are used.
 */
export function aiModels(variable: "AI_MODEL" | "AI_FALLBACK_MODEL", defaults: string[]): string[] {
  const models = list(process.env[variable]);
  return models.length ? models : [...defaults];
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
