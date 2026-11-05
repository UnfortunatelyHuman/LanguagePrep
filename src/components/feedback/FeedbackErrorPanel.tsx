import type { FeedbackError, FeedbackErrorKind } from "@/lib/feedback/types";

const TITLES: Record<FeedbackErrorKind, string> = {
  missing_key: "No AI key configured",
  auth: "The AI key was rejected",
  rate_limit: "AI rate limit reached",
  config: "AI settings need attention",
  invalid_response: "The AI's answer was unusable",
  provider: "The AI service had a problem",
  too_short: "Not enough to grade",
  bad_request: "Couldn't submit",
  server: "Something went wrong",
};

/** What the user can do about each kind, beyond the server's message. */
const HINTS: Partial<Record<FeedbackErrorKind, string>> = {
  missing_key: "Your work is still here. After fixing .env.local and restarting `npm run dev`, press Try again.",
  auth: "Your work is still here. After fixing the key and restarting `npm run dev`, press Try again.",
  config: "Your work is still here. After fixing .env.local and restarting `npm run dev`, press Try again.",
  rate_limit: "Free tiers have per-minute and daily limits. Your work is still here.",
};

/** Explains a failed grading request and offers the next step. Nothing is lost. */
export function FeedbackErrorPanel({
  error,
  canEdit,
  onRetry,
  onEdit,
  editLabel = "Keep writing",
}: {
  error: FeedbackError;
  canEdit: boolean;
  onRetry: () => void;
  onEdit: () => void;
  editLabel?: string;
}) {
  const retryable = error.kind !== "too_short" && error.kind !== "bad_request";
  return (
    <section role="alert" className="flex flex-col gap-3 rounded-xl border border-warn/40 bg-warn/10 p-4 text-sm">
      <div>
        <h2 className="font-semibold text-warn">{TITLES[error.kind] ?? TITLES.server}</h2>
        <p className="mt-1 leading-relaxed">{error.message}</p>
        {HINTS[error.kind] ? <p className="mt-1 leading-relaxed text-muted">{HINTS[error.kind]}</p> : null}
        {!HINTS[error.kind] && retryable ? (
          <p className="mt-1 text-muted">Your work is still here and nothing was saved yet.</p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {retryable ? (
          <button type="button" onClick={onRetry} className="rounded-lg bg-accent px-3 py-1.5 font-medium text-white">
            Try again
          </button>
        ) : null}
        {canEdit ? (
          <button type="button" onClick={onEdit} className="rounded-lg border border-border bg-surface px-3 py-1.5 font-medium">
            {editLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}
