import { AiError } from "../errors";
import type { JsonRequest, ProviderAdapter } from "../types";

/**
 * AI_PROVIDER=mock: realistic fake answers with no network call, for automated
 * tests and offline work. It fills whatever JSON Schema it's given, using the
 * field names to pick plausible content: rubric comments and scores near the
 * targets, three fixes, the candidate's own text echoed as the "corrected" or
 * "improved" version, an examiner reply in French, valid practice sets.
 *
 * A caller can pass `mockFixture` for replies the generic filler can't make
 * consistent (exercises whose answer must match their options).
 *
 * AI_MOCK_ERROR=rate_limit | overloaded makes every call fail that way, to
 * test the fallbacks without spending real quota.
 */

type Schema = {
  type?: string | string[];
  properties?: Record<string, Schema>;
  items?: Schema;
  enum?: unknown[];
  const?: unknown;
  anyOf?: Schema[];
  oneOf?: Schema[];
  allOf?: Schema[];
  $ref?: string;
  $defs?: Record<string, Schema>;
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
};

type Context = {
  root: Schema;
  french: boolean;
  /** Candidate texts quoted in the prompt, in order (writing or transcripts). */
  texts: string[];
  key: string;
  parentKey: string;
  index: number;
};

const COMMENTS = [
  "Clear and relevant: the main ideas answer the task and follow a logical order. Some points are stated rather than developed, and a few connectors are repeated.",
  "A good range of everyday vocabulary with some precise choices; a handful of word-form slips and one or two literal translations.",
  "Mostly accurate sentences with some complex structures. Errors appear in longer sentences (agreement, tense consistency) but never block meaning.",
  "All required parts are covered with an appropriate tone, though the last point is shorter than the others.",
];

const STRENGTHS = [
  "Answers every part of the task",
  "Good use of linking words to connect ideas",
  "Tone suits the reader and the situation",
  "Concrete examples support the main points",
];

const FIXES = {
  en: [
    { title: "Develop each point", explanation: "Add a reason or an example after each idea so it doesn't stay a bare statement.", before: "It is good for me.", after: "It would save me about an hour a day, which I could spend studying." },
    { title: "Check subject–verb agreement", explanation: "Third-person singular verbs need -s in the present tense.", before: "My manager have", after: "My manager has" },
    { title: "Vary your connectors", explanation: "Replace repeated “and” and “also” with more precise links.", before: "and also", after: "moreover / as a result" },
  ],
  fr: [
    { title: "Développez chaque idée", explanation: "Add a reason or an example after each idea.", before: "C'est bien pour moi.", after: "Cela me ferait gagner une heure par jour, que je pourrais consacrer à mes études." },
    { title: "Accord sujet–verbe", explanation: "The verb must agree with its subject.", before: "les gens pense", after: "les gens pensent" },
    { title: "Variez les connecteurs", explanation: "Use more precise connectors than “et” and “aussi”.", before: "et aussi", after: "de plus / par conséquent" },
  ],
};

const SENTENCES = {
  en: [
    "The community centre will offer evening classes starting next month.",
    "Residents can register online or at the front desk before the end of the week.",
    "Several people said the new schedule works better for families with young children.",
    "Others worry that the fees will rise once the pilot project ends.",
  ],
  fr: [
    "Le centre communautaire proposera des cours du soir dès le mois prochain.",
    "Les résidents peuvent s'inscrire en ligne ou à l'accueil avant la fin de la semaine.",
    "Plusieurs personnes trouvent que le nouvel horaire convient mieux aux familles.",
    "D'autres craignent une hausse des frais à la fin du projet pilote.",
  ],
};

function resolve(schema: Schema, root: Schema): Schema {
  let node = schema;
  for (let i = 0; node.$ref && i < 10; i++) {
    const path = node.$ref.replace(/^#\//, "").split("/");
    node = path.reduce<unknown>((n, part) => (n as Record<string, unknown>)?.[part], root) as Schema;
    if (!node) return {};
  }
  if (node.allOf?.length) return node.allOf.reduce<Schema>((a, b) => ({ ...a, ...resolve(b, root) }), {});
  return node;
}

function fit(text: string, schema: Schema, filler: string): string {
  let out = text;
  while (schema.minLength && out.length < schema.minLength) out = `${out} ${filler}`.trim();
  return schema.maxLength ? out.slice(0, schema.maxLength) : out;
}

function stringFor(schema: Schema, ctx: Context): string {
  const { key, parentKey, index, french, texts } = ctx;
  const lang = french ? "fr" : "en";
  const sentence = SENTENCES[lang][index % SENTENCES[lang].length];
  const own = texts[index] ?? texts[0] ?? "";
  const fix = FIXES[lang][index % 3];

  let value: string;
  if (parentKey === "fixes" && key in fix) value = fix[key as keyof typeof fix];
  else if (parentKey === "strengths") value = STRENGTHS[index % STRENGTHS.length];
  else if (key === "comment") value = COMMENTS[index % COMMENTS.length];
  else if (key === "summary") {
    value = "A solid performance close to your target, with clear ideas and generally accurate language. The biggest lever is developing each point with a reason and an example.";
  } else if (key === "corrected" || key === "improved") value = own;
  else if (key === "reply") value = "Oui, bien sûr. Le loyer est de 1 200 $ par mois, chauffage compris, et l'appartement est libre à partir du 1er juillet.";
  else if (key === "script") value = "F: Bonjour, je voudrais des renseignements sur les cours du soir.\nH: Bien sûr. Ils commencent le mois prochain, le mardi et le jeudi.";
  else if (key === "emoji") value = ["🌳", "🚲", "☕", "🐕", "🏠", "🚌", "📚", "🎈", "🛒"][index % 9];
  else if (key === "title") value = french ? "Série IA : test simulé" : "Mock practice set";
  else if (key === "explanation") value = "The text says this directly; the other options change a detail or add something the text doesn't say.";
  else if (key === "stem" || key === "question") value = french ? "Que propose le centre communautaire ?" : "What will the community centre offer?";
  else value = sentence;

  return fit(value, schema, sentence);
}

function numberFor(schema: Schema, ctx: Context, integer: boolean): number {
  const min = schema.minimum ?? (schema.exclusiveMinimum !== undefined ? schema.exclusiveMinimum + 1 : 0);
  const max = schema.maximum ?? (schema.exclusiveMaximum !== undefined ? schema.exclusiveMaximum - 1 : min + 10);
  let value: number;
  if (ctx.key === "score") {
    // Near the targets: CELPIP 9–10 on 1–12, TCF 10–13 on 0–20.
    value = max <= 12 ? [9, 10, 9, 10][ctx.index % 4] : [11, 12, 10, 13][ctx.index % 4];
  } else {
    // Answer indexes, speaker indexes…: spread across the range.
    value = min + (ctx.index % (max - min + 1));
  }
  value = Math.min(max, Math.max(min, value));
  return integer ? Math.round(value) : value;
}

function valueFor(raw: Schema, ctx: Context): unknown {
  const schema = resolve(raw, ctx.root);
  if (schema.const !== undefined) return schema.const;
  if (schema.enum?.length) return schema.enum[ctx.index % schema.enum.length];
  const choice = schema.anyOf ?? schema.oneOf;
  if (choice?.length) {
    const usable = choice.find((c) => resolve(c, ctx.root).type !== "null") ?? choice[0];
    return valueFor(usable, ctx);
  }
  const type = Array.isArray(schema.type) ? schema.type.find((t) => t !== "null") : schema.type;

  if (type === "object" || schema.properties) {
    return Object.fromEntries(
      Object.entries(schema.properties ?? {}).map(([key, child], i) => [
        key,
        valueFor(child, { ...ctx, key, parentKey: ctx.key, index: ctx.key === "dimensions" ? i : ctx.index }),
      ]),
    );
  }
  if (type === "array") {
    const count = Math.max(schema.minItems ?? 1, Math.min(schema.maxItems ?? 2, 2));
    return Array.from({ length: count }, (_, i) =>
      valueFor(schema.items ?? {}, { ...ctx, parentKey: ctx.key, index: i }),
    );
  }
  if (type === "integer") return numberFor(schema, ctx, true);
  if (type === "number") return numberFor(schema, ctx, false);
  if (type === "boolean") return false;
  if (type === "null") return null;
  return stringFor(schema, ctx);
}

/** Candidate texts the graders quote in the prompt, so fake corrections echo them. */
function quotedTexts(prompt: string): string[] {
  return [...prompt.matchAll(/<(candidate_text|transcript)>([\s\S]*?)<\/\1>/g)]
    .map((m) => m[2].trim())
    .map((t) => (t === "[nothing recognized]" ? "" : t));
}

async function generateJSON(request: JsonRequest): Promise<string> {
  const failure = process.env.AI_MOCK_ERROR?.trim().toLowerCase();
  if (failure === "rate_limit") {
    throw new AiError("rate_limit", `Mock rate limit for "${request.model}" (AI_MOCK_ERROR). Try again in about 60 s.`, {
      retryAfterSeconds: 60,
      modelProblem: "rate_limited",
    });
  }
  if (failure === "overloaded") {
    throw new AiError("provider", `Mock "${request.model}" is overloaded (AI_MOCK_ERROR).`, { modelProblem: "overloaded" });
  }

  await new Promise((resolveDelay) => setTimeout(resolveDelay, 150));
  if (request.mockFixture) return JSON.stringify(request.mockFixture());
  // French graders and the examiner have French system prompts; generation prompts name one exam.
  const french =
    /^Vous (êtes|jouez)/.test(request.system ?? "") || (/TCF/.test(request.prompt) && !/CELPIP/.test(request.prompt));
  const root = request.jsonSchema as Schema;
  const data = valueFor(root, { root, french, texts: quotedTexts(request.prompt), key: "", parentKey: "", index: 0 });
  return JSON.stringify(data);
}

export const mock: ProviderAdapter = {
  name: "mock",
  defaultModels: ["mock"],
  generateJSON,
};
