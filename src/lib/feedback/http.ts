import "server-only";
import { isAiError } from "@/lib/ai";
import type { FeedbackError, FeedbackErrorKind } from "./types";

/** JSON error response every AI feedback route uses. */
export function feedbackFailure(
  status: number,
  kind: FeedbackErrorKind,
  message: string,
  retryAfterSeconds?: number,
): Response {
  const body: FeedbackError = { kind, message, retryAfterSeconds };
  return Response.json(
    { error: body },
    { status, headers: retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : undefined },
  );
}

/** Map anything thrown while grading to a safe response, logging the details server-side. */
export function feedbackErrorResponse(route: string, error: unknown): Response {
  if (isAiError(error)) {
    console.error(`[${route}] AI ${error.kind}: ${error.message}`, error.cause ?? "");
    return feedbackFailure(error.status, error.kind, error.message, error.retryAfterSeconds);
  }
  console.error(`[${route}] unexpected error`, error);
  return feedbackFailure(
    500,
    "server",
    "Something went wrong on the server while grading. Your work is still here, so you can try again.",
  );
}

/** Clamp a client-reported duration to [0, max] seconds, or null if it isn't a number. */
export function clampSeconds(value: unknown, max: number): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(0, Math.round(value)))
    : null;
}
