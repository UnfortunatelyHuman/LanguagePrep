export type DiffPart = { type: "same" | "del" | "add"; text: string };

/** Words, single punctuation marks, and runs of whitespace. */
function tokenize(text: string): string[] {
  return text.match(/\s+|[\p{L}\p{N}\p{M}'’-]+|[^\s\p{L}\p{N}]/gu) ?? [];
}

const isSpace = (t: string) => /^\s+$/.test(t);

function sameToken(a: string, b: string): boolean {
  return a === b || (isSpace(a) && isSpace(b));
}

/** Above this many cells the LCS table is too big; show a plain replacement. */
const MAX_CELLS = 4_000_000;

/**
 * Word-level diff from `before` to `after` (longest common subsequence), with
 * adjacent pieces of the same type merged. Where both sides have whitespace,
 * line breaks from `before` win: models often flatten paragraphs when
 * correcting, and the writer's layout should survive.
 */
export function diffWords(before: string, after: string): DiffPart[] {
  const a = tokenize(before);
  const b = tokenize(after);
  if (a.length * b.length > MAX_CELLS) {
    return [
      { type: "del", text: before },
      { type: "add", text: after },
    ];
  }

  // lcs[i][j] = LCS length of a[i:] and b[j:], in a flat array.
  const w = b.length + 1;
  const lcs = new Uint16Array((a.length + 1) * w);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i * w + j] = sameToken(a[i], b[j])
        ? lcs[(i + 1) * w + j + 1] + 1
        : Math.max(lcs[(i + 1) * w + j], lcs[i * w + j + 1]);
    }
  }

  const parts: DiffPart[] = [];
  const push = (type: DiffPart["type"], text: string) => {
    const last = parts.at(-1);
    if (last && last.type === type) last.text += text;
    else parts.push({ type, text });
  };

  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (sameToken(a[i], b[j])) {
      push("same", a[i].includes("\n") && !b[j].includes("\n") ? a[i] : b[j]);
      i++;
      j++;
    } else if (lcs[(i + 1) * w + j] >= lcs[i * w + j + 1]) {
      push("del", a[i++]);
    } else {
      push("add", b[j++]);
    }
  }
  while (i < a.length) push("del", a[i++]);
  while (j < b.length) push("add", b[j++]);

  // A deleted or added run that is only whitespace is noise; keep it as plain text.
  return parts.map((p) =>
    p.type !== "same" && isSpace(p.text) ? { type: "same", text: p.type === "add" ? p.text : "" } : p,
  );
}

/** How many words changed, for a "12 corrections" style summary. */
export function changedWordCount(parts: DiffPart[]): number {
  return parts
    .filter((p) => p.type === "add")
    .reduce((n, p) => n + (p.text.match(/[\p{L}\p{N}]+/gu)?.length ?? 0), 0);
}

/** The corrected text with the writer's paragraph breaks put back where the model dropped them. */
export function keepParagraphs(before: string, after: string): string {
  if (!after.trim()) return after;
  return diffWords(before, after)
    .filter((p) => p.type !== "del")
    .map((p) => p.text)
    .join("");
}
