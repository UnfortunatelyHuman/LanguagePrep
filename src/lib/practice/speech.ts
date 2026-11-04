/**
 * Text-to-speech for listening clips, on top of the browser's speechSynthesis.
 *
 * - Voices: prefer the Canadian locale (en-CA / fr-CA), then nearby fallbacks
 *   (en-US → en-GB → any en; fr-FR → any fr), then whatever exists.
 * - Speakers in one clip get different voices where the browser has enough;
 *   when it doesn't, pitch is shifted so voices still sound distinct.
 * - Lines are spoken one sentence-sized chunk at a time. Chrome can silently
 *   stop long utterances, and short chunks plus a watchdog keep a clip moving.
 */

import type { AudioLine, Speaker } from "@/lib/practice/types";

export type ClipLocale = "en-CA" | "fr-CA";

/** Normal conversational pace; 1 is each voice's natural rate. */
export const SPEECH_RATE = 1;

const FALLBACKS: Record<ClipLocale, string[]> = {
  "en-CA": ["en-CA", "en-US", "en-GB", "en-AU", "en"],
  "fr-CA": ["fr-CA", "fr-FR", "fr-BE", "fr-CH", "fr"],
};

// Speech engines don't report gender, so match on common voice names.
const FEMALE =
  /\b(female|woman|clara|sylvie|am[eé]lie|chantal|samantha|karen|moira|tessa|fiona|victoria|zira|aria|jenny|emma|ava|allison|susan|hazel|libby|sonia|natasha|denise|julie|hortense|audrey|aur[eé]lie|marie|c[eé]line|elsa|ariane|joanna|salli|kimberly|ivy|kendra|linda|heather|catherine|sara|nicole|kate|serena|martha|flo|sandy|shelley|joelle|caroline|vivienne|brigitte|eloise|coralie|jacqueline|michelle|nancy)\b/i;
const MALE =
  /\b(male|man|liam|antoine|jean|thomas|nicolas|daniel|alex|fred|tom|aaron|arthur|gordon|lee|oliver|rishi|guy|brian|christopher|eric|davis|ryan|george|henri|paul|claude|r[eé]my|j[eé]r[oô]me|matthew|justin|joey|ralph|eddy|reed|jacques|thierry|mark|david|james|william|andrew|alain|yves|maxime|gilles|fabrice|s[eé]bastien)\b/i;

function genderOf(voice: SpeechSynthesisVoice): Speaker["gender"] | null {
  if (FEMALE.test(voice.name)) return "female";
  if (MALE.test(voice.name)) return "male";
  return null;
}

/** Android reports "en_CA"; normalise to "en-CA". */
const tag = (voice: SpeechSynthesisVoice) => voice.lang.replace("_", "-");

/** Lower is better: locale first, then quality hints in the name. */
function rank(voice: SpeechSynthesisVoice, locale: ClipLocale): number {
  const order = FALLBACKS[locale];
  const lang = tag(voice).toLowerCase();
  let localeRank = order.findIndex((want) =>
    want.length === 2 ? lang.startsWith(want) : lang === want.toLowerCase(),
  );
  if (localeRank < 0) localeRank = order.length;
  const quality = /natural|neural|online|premium|enhanced/i.test(voice.name)
    ? 0
    : /google/i.test(voice.name)
      ? 1
      : 2;
  return localeRank * 10 + quality;
}

/** Voices that speak the clip's language, best first. Empty if none do. */
export function voicesFor(
  all: SpeechSynthesisVoice[],
  locale: ClipLocale,
): SpeechSynthesisVoice[] {
  const base = locale.slice(0, 2);
  return all
    .filter((v) => tag(v).toLowerCase().startsWith(base))
    .sort((a, b) => rank(a, locale) - rank(b, locale));
}

export type VoiceChoice = {
  voice: SpeechSynthesisVoice | null;
  pitch: number;
};

/**
 * Give each speaker the best unused voice of the right gender, falling back to
 * an unused voice of unknown gender, then any unused voice, then a shared one
 * with the pitch shifted so two speakers never sound identical.
 */
export function assignVoices(
  all: SpeechSynthesisVoice[],
  locale: ClipLocale,
  speakers: [id: string, Speaker][],
): Map<string, VoiceChoice> {
  const pool = voicesFor(all, locale);
  const used = new Set<SpeechSynthesisVoice>();
  const result = new Map<string, VoiceChoice>();
  const shiftedPitch = (gender: Speaker["gender"]) =>
    gender === "female" ? 1.15 : 0.82;

  for (const [id, speaker] of speakers) {
    const free = pool.filter((v) => !used.has(v));
    const voice =
      free.find((v) => genderOf(v) === speaker.gender) ??
      free.find((v) => genderOf(v) === null) ??
      free[0] ??
      null;

    if (voice) {
      used.add(voice);
      const known = genderOf(voice);
      // A voice of unknown or opposite gender gets nudged towards the speaker's.
      const pitch = known === speaker.gender ? 1 : shiftedPitch(speaker.gender);
      result.set(id, { voice, pitch });
    } else {
      // Ran out of distinct voices: reuse the best one, shifted per speaker.
      const reuse = pool.find((v) => genderOf(v) === speaker.gender) ?? pool[0] ?? null;
      const sameVoiceCount = [...result.values()].filter((c) => c.voice === reuse).length;
      const pitch = shiftedPitch(speaker.gender) + (sameVoiceCount % 2 ? 0.08 : -0.04);
      result.set(id, { voice: reuse, pitch });
    }
  }
  return result;
}

export type Chunk = {
  text: string;
  voice: SpeechSynthesisVoice | null;
  pitch: number;
  /** Silence after this chunk, in ms (longer at a change of speaker). */
  pauseAfter: number;
  /** Index of the script line this chunk belongs to. */
  line: number;
};

/** Split a line into sentence-sized pieces (under ~220 characters each). */
function sentences(text: string): string[] {
  const parts = text.match(/[^.!?…]+(?:[.!?…]+["»”’)]*|$)\s*/g) ?? [text];
  const out: string[] = [];
  for (const raw of parts) {
    const part = raw.trim();
    if (!part) continue;
    const last = out[out.length - 1];
    if (last && last.length + part.length < 220) out[out.length - 1] = `${last} ${part}`;
    else out.push(part);
  }
  return out;
}

export function buildChunks(
  lines: AudioLine[],
  voices: Map<string, VoiceChoice>,
): Chunk[] {
  const chunks: Chunk[] = [];
  lines.forEach((line, i) => {
    const choice = voices.get(line.speaker) ?? { voice: null, pitch: 1 };
    const pieces = sentences(line.text);
    const speakerChanges = lines[i + 1] && lines[i + 1].speaker !== line.speaker;
    pieces.forEach((text, j) => {
      const lastPiece = j === pieces.length - 1;
      chunks.push({
        text,
        voice: choice.voice,
        pitch: choice.pitch,
        pauseAfter: lastPiece ? (speakerChanges ? 450 : 300) : 120,
        line: i,
      });
    });
  });
  return chunks;
}

/**
 * Speak chunks in order. Returns a cancel function. `onLine` reports which
 * script line is playing (for a progress indicator); `onEnd` fires once.
 */
export function speakChunks(
  chunks: Chunk[],
  locale: ClipLocale,
  { onLine, onEnd }: { onLine?: (line: number) => void; onEnd: () => void },
): () => void {
  const synth = window.speechSynthesis;
  let cancelled = false;
  let index = 0;
  let gap: number | undefined;
  let watchdog: number | undefined;
  // Holding references stops some browsers from garbage-collecting an
  // utterance mid-speech, which drops its `end` event.
  const alive: SpeechSynthesisUtterance[] = [];

  synth.cancel();

  const next = () => {
    if (cancelled) return;
    if (index >= chunks.length) {
      onEnd();
      return;
    }
    const chunk = chunks[index++];
    onLine?.(chunk.line);

    const u = new SpeechSynthesisUtterance(chunk.text);
    if (chunk.voice) u.voice = chunk.voice;
    u.lang = chunk.voice ? tag(chunk.voice) : locale;
    u.rate = SPEECH_RATE;
    u.pitch = chunk.pitch;
    alive.push(u);

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearInterval(watchdog);
      gap = window.setTimeout(next, chunk.pauseAfter);
    };
    u.onend = finish;
    u.onerror = finish;

    // If the engine goes quiet without firing `end`, move on after 2 s.
    let quietMs = 0;
    watchdog = window.setInterval(() => {
      if (synth.speaking || synth.pending) quietMs = 0;
      else if ((quietMs += 500) >= 2000) finish();
    }, 500);

    synth.speak(u);
  };

  next();

  return () => {
    cancelled = true;
    window.clearTimeout(gap);
    window.clearInterval(watchdog);
    synth.cancel();
  };
}

export function localeFor(exam: "celpip" | "tcf"): ClipLocale {
  return exam === "celpip" ? "en-CA" : "fr-CA";
}
