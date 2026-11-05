/**
 * Every failure in the AI layer becomes an AiError with a `kind` the UI can
 * act on and a `message` that is safe to show (never a key or a stack trace).
 */
export type AiErrorKind =
  /** The provider's API key (or base URL) is not configured. */
  | "missing_key"
  /** The key is set but the provider rejected it. */
  | "auth"
  /** HTTP 429 or quota exhausted. */
  | "rate_limit"
  /** AI_PROVIDER names something unknown, or an adapter that is not finished. */
  | "config"
  /** The model answered, but not with JSON matching the schema. */
  | "invalid_response"
  /** Timeouts, 5xx, network errors, safety blocks, anything else. */
  | "provider";

/** HTTP status the API route should answer with for each kind. */
const STATUS: Record<AiErrorKind, number> = {
  missing_key: 503,
  auth: 503,
  rate_limit: 429,
  config: 503,
  invalid_response: 502,
  provider: 502,
};

/**
 * Why trying another model might help: the model is overloaded right now, or
 * it is retired / unknown. Set by adapters; read by the fallback loop.
 */
export type ModelProblem = "overloaded" | "unavailable";

export class AiError extends Error {
  readonly kind: AiErrorKind;
  readonly modelProblem?: ModelProblem;
  /** Seconds the provider asked us to wait, when it said (rate limits). */
  readonly retryAfterSeconds?: number;

  constructor(
    kind: AiErrorKind,
    message: string,
    options?: { cause?: unknown; retryAfterSeconds?: number; modelProblem?: ModelProblem },
  ) {
    super(message, { cause: options?.cause });
    this.name = "AiError";
    this.kind = kind;
    this.retryAfterSeconds = options?.retryAfterSeconds;
    this.modelProblem = options?.modelProblem;
  }

  get status(): number {
    return STATUS[this.kind];
  }
}

export function isAiError(error: unknown): error is AiError {
  return error instanceof AiError;
}
