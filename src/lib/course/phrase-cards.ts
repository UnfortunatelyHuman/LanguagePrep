import "server-only";
import { io } from "next/cache";
import { phraseCategories } from "@/lib/phrases";
import { prisma } from "@/lib/prisma";
import { SAVED_PREFIX } from "@/lib/saved-phrases";
import { addCards, insertCards, reviewCard, today } from "./cards";

/**
 * The French phrase bank and the course's review queue share cards:
 * - a phrase-bank entry joins the queue when the learner adds it;
 * - phrases saved from TCF feedback join it automatically;
 * - a phrase-bank self-test answer counts as a review of that card.
 */

/** Phrase-bank keys (file phrases and "mine:" saved ones) that have a review card. */
export async function phraseKeysInReview(): Promise<Set<string>> {
  await io();
  await syncSavedPhrases();
  const cards = await prisma.reviewCard.findMany({
    where: { source: { in: ["phrase-bank", "saved-phrase"] } },
    select: { source: true, sourceId: true },
  });
  return new Set(cards.map((c) => (c.source === "saved-phrase" ? `${SAVED_PREFIX}${c.sourceId}` : c.sourceId)));
}

/** Add one French phrase-bank entry to the queue. False if the key is unknown. */
export async function addPhraseToReview(key: string): Promise<boolean> {
  const phrase = phraseCategories("fr")
    .flatMap((c) => c.phrases)
    .find((p) => p.key === key);
  if (!phrase) return false;
  await addCards("phrase-bank", key, [{ kind: "phrase", front: phrase.phrase, back: phrase.meaning, example: phrase.example }]);
  return true;
}

const savedCard = (row: { id: string; phrase: string; note: string; before: string | null }) => ({
  source: "saved-phrase",
  sourceId: row.id,
  kind: "phrase",
  front: row.phrase,
  back: row.before ? `Instead of “${row.before}”: ${row.note}` : row.note,
  example: null,
});

/** Make sure every phrase saved from TCF feedback has a card (catches ones saved before the course existed). */
export async function syncSavedPhrases(): Promise<void> {
  const [saved, cards] = await Promise.all([
    prisma.savedPhrase.findMany({ where: { exam: "tcf" }, select: { id: true, phrase: true, note: true, before: true } }),
    prisma.reviewCard.findMany({ where: { source: "saved-phrase" }, select: { sourceId: true } }),
  ]);
  const have = new Set(cards.map((c) => c.sourceId));
  const missing = saved.filter((s) => !have.has(s.id));
  if (!missing.length) return;
  const due = await today();
  await insertCards(missing.map((row) => ({ ...savedCard(row), due })));
}

/** A saved phrase was removed from the bank: drop its card too. */
export async function removeSavedPhraseCard(savedPhraseId: string): Promise<void> {
  await prisma.reviewCard.deleteMany({ where: { source: "saved-phrase", sourceId: savedPhraseId } });
}

/** A phrase-bank self-test answer counts as a review ("good" or "again") of its card, if it has one. */
export async function countSelfTest(key: string, known: boolean): Promise<void> {
  const where = key.startsWith(SAVED_PREFIX)
    ? { source: "saved-phrase", sourceId: key.slice(SAVED_PREFIX.length) }
    : { source: "phrase-bank", sourceId: key };
  const card = await prisma.reviewCard.findFirst({ where, select: { id: true } });
  if (card) await reviewCard(card.id, known ? "good" : "again");
}
