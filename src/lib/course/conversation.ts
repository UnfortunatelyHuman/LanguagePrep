import "server-only";
import { io } from "next/cache";
import { generateJSON } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { countActivity } from "./cards";
import { chatFixture } from "./fixtures";
import { latestPlacement } from "./placement-store";
import { chatPrompt } from "./prompts";
import { ChatTurnSchema, type ChatTurn } from "./schemas";
import { CEFR_LEVELS, getScenario, type Cefr } from "./syllabus";

/**
 * Role-play conversations with the AI partner. One AI request per learner
 * message returns the partner's reply and a gentle correction of the message.
 */

/** A conversation ends after this many messages (both sides). */
export const MAX_MESSAGES = 30;
/** Messages of history sent with each request. */
const HISTORY = 12;
export const MAX_MESSAGE_CHARS = 600;

export type ChatMessage =
  | { role: "learner"; text: string; correction?: ChatTurn["correction"] }
  | { role: "partner"; text: string; replyEn: string; newWords: ChatTurn["newWords"] };

export type StoredConversation = {
  id: string;
  scenarioId: string | null;
  title: string;
  level: Cefr;
  messages: ChatMessage[];
  ended: boolean;
  updatedAt: Date;
};

const toStored = (row: {
  id: string;
  scenarioId: string | null;
  title: string;
  level: string;
  messages: unknown;
  ended: boolean;
  updatedAt: Date;
}): StoredConversation => ({
  ...row,
  level: (CEFR_LEVELS as readonly string[]).includes(row.level) ? (row.level as Cefr) : "A2",
  messages: Array.isArray(row.messages) ? (row.messages as ChatMessage[]) : [],
});

/** The level the partner speaks at: the lower of grammar and vocabulary from the last placement, else A2. */
export async function learnerLevel(): Promise<Cefr> {
  const placement = await latestPlacement();
  if (!placement) return "A2";
  const { grammar, vocabulary } = placement.levels;
  return CEFR_LEVELS[Math.min(CEFR_LEVELS.indexOf(grammar), CEFR_LEVELS.indexOf(vocabulary))];
}

export async function listConversations(): Promise<StoredConversation[]> {
  await io();
  const rows = await prisma.conversation.findMany({ orderBy: { updatedAt: "desc" }, take: 30 });
  return rows.map(toStored);
}

export async function getConversation(id: string): Promise<StoredConversation | null> {
  await io();
  const row = await prisma.conversation.findUnique({ where: { id } });
  return row ? toStored(row) : null;
}

export async function startConversation(scenarioId: string | null): Promise<string> {
  const scenario = scenarioId ? getScenario(scenarioId) : null;
  const row = await prisma.conversation.create({
    data: {
      scenarioId: scenario?.id ?? null,
      title: scenario?.title ?? "Conversation libre",
      level: await learnerLevel(),
      messages: [],
    },
    select: { id: true },
  });
  return row.id;
}

export class ConversationClosed extends Error {}

/** Send one learner message: one AI request. Throws AiError or ConversationClosed. */
export async function sendMessage(id: string, text: string): Promise<StoredConversation> {
  const convo = await getConversation(id);
  if (!convo || convo.ended || convo.messages.length >= MAX_MESSAGES) throw new ConversationClosed();
  const message = text.trim().slice(0, MAX_MESSAGE_CHARS);
  const scenario = convo.scenarioId ? (getScenario(convo.scenarioId) ?? null) : null;
  const history = convo.messages.slice(-HISTORY).map((m) => ({ role: m.role, text: m.text }));
  const turnIndex = convo.messages.length / 2;

  const { system, prompt } = chatPrompt({ level: convo.level, scenario, history, message });
  const turn = await generateJSON(prompt, ChatTurnSchema, {
    system,
    temperature: 0.8,
    timeoutMs: 45_000,
    mockFixture: () => chatFixture(message, turnIndex),
  });

  const messages: ChatMessage[] = [
    ...convo.messages,
    { role: "learner", text: message, correction: turn.correction },
    { role: "partner", text: turn.reply, replyEn: turn.replyEn, newWords: turn.newWords },
  ];
  const ended = turn.ended || messages.length >= MAX_MESSAGES;
  const row = await prisma.conversation.update({ where: { id }, data: { messages, ended } });
  await countActivity("messages");
  return toStored(row);
}

export async function endConversation(id: string): Promise<void> {
  await prisma.conversation.updateMany({ where: { id }, data: { ended: true } });
}

export async function deleteConversation(id: string): Promise<void> {
  await prisma.$transaction([
    prisma.reviewCard.deleteMany({ where: { source: "chat", sourceId: id, introducedDay: null } }),
    prisma.conversation.deleteMany({ where: { id } }),
  ]);
}
