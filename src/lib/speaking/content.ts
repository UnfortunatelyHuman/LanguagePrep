import celpipSet1 from "../../../content/celpip/speaking/set-1.json";
import celpipSet2 from "../../../content/celpip/speaking/set-2.json";
import tcfSet1 from "../../../content/tcf/speaking/set-1.json";
import tcfSet2 from "../../../content/tcf/speaking/set-2.json";
import tcfSet3 from "../../../content/tcf/speaking/set-3.json";
import tcfSet4 from "../../../content/tcf/speaking/set-4.json";
import type { Track } from "@/lib/exams";
import type { SpeakingKind, SpeakingSet } from "./types";

/** Official task order and timings; content must match them exactly. */
type Rule = { kind: SpeakingKind; prep: number; speak: number; choose?: number };

const CELPIP_RULES: Rule[] = [
  { kind: "celpip-advice", prep: 30, speak: 90 },
  { kind: "celpip-experience", prep: 30, speak: 60 },
  { kind: "celpip-scene", prep: 30, speak: 60 },
  { kind: "celpip-predictions", prep: 30, speak: 60 },
  { kind: "celpip-compare", prep: 60, speak: 60, choose: 60 },
  { kind: "celpip-difficult", prep: 60, speak: 60 },
  { kind: "celpip-opinion", prep: 30, speak: 90 },
  { kind: "celpip-unusual", prep: 30, speak: 60 },
];

const TCF_RULES: Rule[] = [
  { kind: "tcf-interview", prep: 0, speak: 120 },
  { kind: "tcf-roleplay", prep: 120, speak: 210 },
  { kind: "tcf-opinion", prep: 0, speak: 270 },
];

const NEEDS_SCENE = new Set<SpeakingKind>(["celpip-scene", "celpip-predictions", "celpip-unusual"]);
const NEEDS_OPTIONS = new Set<SpeakingKind>(["celpip-compare", "celpip-difficult"]);

/** Fails the build if a speaking file doesn't match the real exam's structure. */
function validate(set: SpeakingSet): SpeakingSet {
  const fail = (msg: string): never => {
    throw new Error(`Speaking set ${set.id}: ${msg}`);
  };
  const rules = set.exam === "celpip" ? CELPIP_RULES : TCF_RULES;
  if (set.tasks.length !== rules.length) fail(`needs ${rules.length} tasks, has ${set.tasks.length}`);

  const ids = new Set<string>();
  set.tasks.forEach((task, i) => {
    const rule = rules[i];
    if (ids.has(task.id)) fail(`duplicate task id ${task.id}`);
    ids.add(task.id);
    if (task.kind !== rule.kind) fail(`task ${i + 1} should be ${rule.kind}, got ${task.kind}`);
    if (task.prepSeconds !== rule.prep || task.speakSeconds !== rule.speak) {
      fail(`${task.id} should be ${rule.prep}s prep / ${rule.speak}s speaking`);
    }
    if ((task.chooseSeconds ?? undefined) !== rule.choose) fail(`${task.id} has the wrong choose time`);
    if (!task.prompt.trim() || !task.label.trim()) fail(`${task.id} is missing text`);
    if (NEEDS_SCENE.has(task.kind) && (task.scene?.items.length ?? 0) < 5) {
      fail(`${task.id} needs a scene with at least 5 items`);
    }
    if (NEEDS_OPTIONS.has(task.kind)) {
      const optionIds = task.options?.map((o) => o.id).join(",");
      if (optionIds !== "A,B") fail(`${task.id} needs options A and B`);
    }
  });
  return set;
}

const SETS: Record<Track, SpeakingSet[]> = {
  en: [celpipSet1, celpipSet2].map((s) => validate(s as SpeakingSet)),
  fr: [tcfSet1, tcfSet2, tcfSet3, tcfSet4].map((s) => validate(s as SpeakingSet)),
};

export function speakingSets(track: Track): SpeakingSet[] {
  return SETS[track];
}

export function findSpeakingSet(track: Track, id: string): SpeakingSet | undefined {
  return SETS[track].find((s) => s.id === id);
}

/** Total seconds of choose + prep + speaking, for "about N minutes" labels. */
export function speakingSeconds(set: SpeakingSet): number {
  return set.tasks.reduce(
    (n, t) => n + (t.chooseSeconds ?? 0) + t.prepSeconds + t.speakSeconds,
    0,
  );
}
