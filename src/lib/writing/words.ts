/**
 * Word count shared by the editor and the server, so both always agree.
 * Tokens are split on whitespace; lone punctuation (French spaced " : ", "–")
 * is not a word. "l'appartement" and "well-known" count as one word.
 */
export function countWords(text: string): number {
  let count = 0;
  for (const token of text.split(/\s+/)) {
    if (/[\p{L}\p{N}]/u.test(token)) count++;
  }
  return count;
}

export type WordStatus = "empty" | "under" | "ok" | "over";

export function wordStatus(count: number, min: number, max: number): WordStatus {
  if (count === 0) return "empty";
  if (count < min) return "under";
  if (count > max) return "over";
  return "ok";
}
