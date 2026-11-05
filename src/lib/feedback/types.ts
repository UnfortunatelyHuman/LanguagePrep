/** Error body the AI feedback routes return, safe to show as-is. */
export type FeedbackErrorKind =
  | "missing_key"
  | "auth"
  | "rate_limit"
  | "config"
  | "invalid_response"
  | "provider"
  | "too_short"
  | "bad_request"
  | "server";

export type FeedbackError = {
  kind: FeedbackErrorKind;
  message: string;
  retryAfterSeconds?: number;
};

/** How long the browser waits for a grading request (the server stops at ~3 min). */
export const REQUEST_TIMEOUT_MS = 240_000;
