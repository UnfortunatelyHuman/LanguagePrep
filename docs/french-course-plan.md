# French course plan (Phase 9)

A French course built into the app, for going from my current level to **B2
(NCLC 7)** in all four TCF Canada skills after goFluent ends. It lives under
`/fr/learn` and only exists on the French track.

## Ground rules

- **Original content only.** The syllabus (topics only) is written by hand. All
  lesson content, placement questions, exercises and cards are generated through
  `generateJSON` in `@/lib/ai` (Gemini by default). Prompts never mention
  goFluent or any paid course, and never ask for their material.
- **Quota-friendly.** Nothing is generated until I open it. Everything generated
  is validated, saved in SQLite and reused forever, so a lesson works offline
  once it exists. Reviews and exercise checking make no AI calls.
- **Mock-testable.** Every AI call passes a deterministic fixture (see
  "Mock support"), so `AI_PROVIDER=mock` produces valid lessons, placement
  questions, chat replies and note cards with no quota used. All automated
  tests run that way.
- **Estimates, not scores.** CEFR levels shown by the course are estimates, and
  the UI says so (same rule as the rest of the app).
- Explanations are in English; examples, vocabulary, exercises and
  conversations are in French (Canadian usage where it differs).

## AI calls and their cost

| Call | When | Requests |
|---|---|---|
| Placement question pool | First visit to the placement test, once per level (A1–C1) | 5, once ever |
| Lesson content | First time a lesson is opened | 1 per lesson, once ever |
| Lesson task grading | Submitting the lesson's writing or speaking task | 1 per submission |
| Conversation turn | Each message I send to the partner | 1 per message |
| Unit suggestions | Asking for new syllabus units | 1 per request |
| Notes import | Each import | 1 per import (long notes split in chunks of ~5,000 characters) |
| Reviews, exercises, dashboard | Never | 0 |

A failed or rejected generation saves nothing, so it can be retried. A lesson
has a "Regenerate" button (behind a confirm) only for content that came out
wrong; it's never needed otherwise.

## Features

### 1. Placement test (`/fr/learn/placement`)

- About 20 questions, 5 per skill: grammar, vocabulary, reading (short text +
  question), listening (sentence or short dialogue read by TTS, replayable once).
- Adaptive per skill, staircase style: the first question is A2; a right answer
  moves the next one up a level, a wrong one moves it down (A1–C1).
- Level per skill = the highest level with at least 2 right answers among the
  questions asked at that level or above (A1 if none). Shown with a short
  "what this means" line per skill.
- Questions come from a cached pool (12 per level: 3 per skill), generated on
  the first visit with a progress bar. A retake prefers questions not seen before.
- The result sets the starting unit: the first unit of the lowest placed level
  among grammar and vocabulary (the course order follows grammar). Earlier units
  stay open; I can start anywhere.
- Writing and speaking are not placed; they show "not measured yet" until a
  lesson task or a TCF writing/speaking attempt gives an estimate.

### 2. Curriculum (`content/french-course/syllabus.json`)

Fixed, hand-written, topics only. Each unit has an id, CEFR level, title, a
grammar point, a vocabulary theme, a TCF skill focus and two lessons (A: grammar
first, B: vocabulary and skill focus first). Validated at module load like the
phrase bank, so a malformed file fails the build. Draft list (36 units, 72
lessons of ~15 min ≈ 18 hours plus reviews):

| # | Level | Grammar point | Vocabulary theme | TCF skill focus |
|---|---|---|---|---|
| 1 | A1 | être, avoir, subject pronouns, articles | Greetings, introducing yourself | Speaking: present yourself (EO task 1) |
| 2 | A1 | Present of -er verbs, ne … pas | Daily routine, days, times | Listening: numbers and times |
| 3 | A1 | Gender and plural of nouns and adjectives | Family, describing people | Reading: short notices |
| 4 | A1 | aller, venir, à/de + article, prepositions of place | Town, transport | Listening: directions |
| 5 | A1 | Questions: est-ce que, inversion, question words | Shopping, prices | Speaking: asking for information |
| 6 | A1 | Futur proche, partitive articles, quantities | Food, restaurant | Writing: short message (EE task 1) |
| 7 | A2 | Passé composé with avoir | Weekend, leisure | Writing: message about a past event |
| 8 | A2 | Passé composé with être, agreement | Travel | Listening: announcements |
| 9 | A2 | Reflexive verbs | Health, the body | Speaking: describing a routine |
| 10 | A2 | Imparfait (description, habits) | Childhood memories | Reading: personal letter |
| 11 | A2 | Direct object pronouns le, la, les | Housing, renting | Speaking: role-play, renting (EO task 2) |
| 12 | A2 | Indirect object pronouns lui, leur | Work, colleagues | Reading: workplace email |
| 13 | A2 | Comparatives and superlatives | Cities, weather, seasons | Writing: comparing two places |
| 14 | A2 | Futur simple | Plans, projects | Speaking: future plans |
| 15 | A2 | Pronouns y and en | Errands: bank, post office, services | Listening: phone messages |
| 16 | A2 | Relative pronouns qui, que | Culture, events | Reading: event announcements |
| 17 | B1 | Passé composé vs imparfait in a story | Life events | Writing: article about an experience (EE task 2) |
| 18 | B1 | Conditionnel présent, polite requests | Customer service, complaints | Speaking: role-play, a problem to solve |
| 19 | B1 | si + present / si + imparfait | Environment | Speaking: giving an opinion |
| 20 | B1 | Subjonctif présent after il faut que, vouloir que | Rules, civic life | Reading: regulations and instructions |
| 21 | B1 | Relative pronouns où, dont | Settling in Canada | Listening: radio interview |
| 22 | B1 | Plus-que-parfait, time markers | News | Listening: news item |
| 23 | B1 | Reported speech (present) | Phone calls, messages | Reading: reported information |
| 24 | B1 | Connectors of cause and consequence | Education, training | Writing: argued paragraph |
| 25 | B1 | Demonstrative and possessive pronouns | Shopping, technology | Reading: comparing offers |
| 26 | B1 | Gérondif | Sport, wellbeing | Speaking: giving advice |
| 27 | B2 | Subjonctif after emotion, doubt, opinion | Debates, opinions | Speaking: defending a view (EO task 3) |
| 28 | B2 | Concession and opposition: bien que, pourtant, alors que | Work-life balance | Writing: comparing two documents (EE task 3) |
| 29 | B2 | Passive voice | Media, information | Reading: press article |
| 30 | B2 | Conditionnel passé, regrets and reproaches | Life choices | Writing: letter about a decision |
| 31 | B2 | si + plus-que-parfait | History, turning points | Listening: documentary extract |
| 32 | B2 | lequel, auquel, duquel | Health care, public services | Reading: official text |
| 33 | B2 | Nominalisation | Social issues | Reading: opinion piece |
| 34 | B2 | Reported speech in the past, sequence of tenses | Meetings at work | Listening: discussion |
| 35 | B2 | Formal register, participe présent | Formal letters, complaints | Writing: formal letter |
| 36 | B2 | Emphasis (c'est … qui/que), structuring an argument | City vs country, remote work | TCF-style mixed task |

**Adding units later** (`/fr/learn/units/new`): describe what I want ("more B2
units about workplace French", "a unit on the subjonctif passé"). The AI
(1 request) suggests 1–5 units in the same shape (level, title, grammar point,
vocabulary theme, skill focus), told which units already exist so it doesn't
repeat them. I edit or untick them, then save. A unit can also be added by hand
with the same form, with no AI. Added units are stored in `CourseUnit` (ids
`my-u01`…), appear at the end of their level, get lessons generated the same
way, and can be edited or deleted (deleting removes their cached lessons and
cards). `syllabus.json` itself stays hand-written.

Each level ends with a **checkpoint**: a 20-question quiz built from the cached
exercises of that level's lessons (no AI call), which marks the level done at 70%.

### 3. Lesson page (`/fr/learn/lessons/[lessonId]`, ~15 min)

1. **Explanation** (English, examples in French with English glosses), 2–4 short
   points plus common pitfalls.
2. **Vocabulary**: 8–12 words or expressions with gender, translation and an
   example; a play button reads each word and example with TTS (`fr-CA`).
3. **Exercises**: 8–10, at least 4 different types, checked locally:
   - multiple choice;
   - fill in the blank (typed; accents and case forgiven with a note);
   - reorder words (the app splits and shuffles the correct sentence itself, so
     the tokens always match);
   - translate English → French (accepted answers list, lenient comparison,
     plus "I was right" to override);
   - listen and choose (TTS sentence, then a question).
   Each answer shows an explanation; wrong answers are listed again at the end.
4. **Mini task**: writing (40–120 words, depending on level) or speaking (record
   + transcript, reusing the speaking capture), graded by AI on the TCF 0–20
   scale with CEFR estimate, strengths, corrected version and 3 fixes.
   Skippable.
5. **Summary**: takeaways, score, the cards added to my review queue, next lesson.

Opening a lesson that isn't cached shows "Preparing your lesson…" and generates
it once. The lesson row is created with a unique id before generating, so two
tabs or a double effect never generate it twice.

### 4. Spaced repetition (`/fr/learn/review`)

- **Cards**: vocabulary (French ↔ English, with audio) and grammar (a sentence
  with a blank and the rule). A finished lesson adds its vocabulary and 3
  grammar cards; notes imports and conversation corrections can add more.
- **Shared with the phrase bank**: TCF phrase-bank entries get an "Add to daily
  review" button, and phrases saved from TCF feedback (`SavedPhrase`) are added
  automatically. A phrase-bank self-test result counts as a review of the card.
- **SM-2**: grades Again / Hard / Good / Easy (quality 1 / 3 / 4 / 5). Ease starts
  at 2.5 (floor 1.3); intervals 1 day, 6 days, then interval × ease; Again resets
  repetitions and counts a lapse. Due dates use the time zone from study
  settings.
- **Daily queue**: all due cards, oldest first, plus up to 10 new cards a day
  (setting, default 10). Typed answers for grammar cards, self-graded flip for vocabulary.

### 5. Conversation partner (`/fr/learn/chat`)

- Pick a scenario (hand-written list in `content/french-course/scenarios.json`,
  topics only, tagged by level: at the bakery, calling a landlord, job interview,
  debating remote work…) or "free conversation". The partner speaks at my level
  (placement or current unit).
- Text input, plus optional speech input (SpeechRecognition `fr-CA`) and
  optional TTS for replies.
- After each message: the reply, then a gentle correction of what I wrote
  (corrected sentence + up to 3 short notes, or "Parfait !"), and up to 3 new
  words. Each correction or word can be saved as a review card.
- One AI call per message; the prompt includes only the last 12 messages. A
  conversation ends after 30 messages or when I end it, and stays readable.

### 6. My notes import (`/fr/learn/notes`)

- Paste vocabulary or grammar notes (e.g. from goFluent classes) with a title.
  The AI turns them into up to 30 review cards and 5–10 exercises (same types as
  lessons), working only from what I pasted plus original examples. Notes are
  treated as data in the prompt, never as instructions.
- I see the cards before they're added and can untick any. The exercises are
  practised like a lesson's.

### 7. Course dashboard (`/fr/learn`)

- Current unit and next lesson ("Continue"), with the unit list by level and
  what's done.
- Streak (days with a lesson, a review session or a conversation) and the
  number of cards due today.
- Level per skill (grammar, vocabulary, reading, listening, writing, speaking):
  placement level, raised by finished checkpoints and lesson-task grades, with
  the B2 target marked. Estimates, labelled as such.
- Shortcuts: daily review, conversation, my notes, placement (retake).
- Linked from the French home dashboard (a card) and the nav ("French course",
  shown only on the French track).

## Data model (Prisma, SQLite)

| Model | Fields (main) | Migration |
|---|---|---|
| `CourseLesson` | `id` ("u07-a"), `unitId`, `level`, `status` ("generating" \| "ready"), `data` Json, `model`, `createdAt` | `course_lessons` |
| `LessonAttempt` | `id`, `lessonId`, `startedAt`, `completedAt?`, `correct`, `total`, `answers` Json, `taskKind?`, `taskText?`, `taskScore?`, `taskFeedback` Json?; index `[lessonId, startedAt]` | `course_lessons` |
| `PlacementQuestion` | `id`, `level`, `skill`, `data` Json, `createdAt`; index `[level, skill]` | `course_placement` |
| `PlacementResult` | `id`, `levels` Json (per skill), `answers` Json, `startUnitId`, `createdAt` | `course_placement` |
| `ReviewCard` | `id`, `kind` ("vocab" \| "grammar" \| "phrase"), `source` ("lesson" \| "notes" \| "chat" \| "phrase-bank" \| "saved-phrase"), `sourceId`, `front`, `back`, `example?`, `ease` 2.5, `intervalDays` 0, `repetitions` 0, `lapses` 0, `dueAt`, `lastReviewedAt?`, `createdAt`; unique `[source, sourceId, front]`, index `[dueAt]` | `course_review_cards` |
| `StudyDay` | `day` ("2026-11-05", id), `lessons`, `reviews`, `messages` | `course_review_cards` |
| `Conversation` | `id`, `scenarioId?`, `title`, `level`, `messages` Json, `ended`, `createdAt`, `updatedAt` | `course_conversations` |
| `NoteImport` | `id`, `title`, `rawText`, `exercises` Json, `model`, `createdAt` (cards live in `ReviewCard` with `source: "notes"`) | `course_notes` |
| `CourseUnit` | `id` ("my-u01"), `level`, `title`, `grammar`, `vocabulary`, `skillFocus`, `source` ("ai" \| "user"), `createdAt` | `course_units` |
| `CourseSettings` | `id` ("fr"), `newCardsPerDay` 10, `ttsReplies` Boolean, `updatedAt` | `course_review_cards` |

Rows are deleted by id only. The data export (`/api/export`) includes these tables.

## Code layout

### Library (`src/lib/course/`)

| File | Purpose |
|---|---|
| `syllabus.ts` | Load + validate `syllabus.json` and `scenarios.json`; unit/lesson lookups, level order |
| `types.ts` | Lesson, Exercise (union), Card, PlacementItem, ChatTurn types |
| `schemas.ts` | zod schemas for every AI reply (below) |
| `prompts.ts` | System prompts and prompt builders (user text wrapped in tags, treated as data) |
| `fixtures.ts` | Deterministic valid fixtures for the mock provider |
| `lessons.ts` (server-only) | `getOrCreateLesson(lessonId)`: cache lookup, generation, validation, save |
| `check.ts` | Answer checking: accent/case/punctuation-lenient compare, reorder shuffling |
| `grade-task.ts` (server-only) | Lesson task grading (reuses `lib/rubric` schemas) |
| `placement.ts` | Pool generation (server) and the pure staircase + level estimate |
| `srs.ts` | Pure SM-2 update and queue selection |
| `cards.ts` (server-only) | Card creation from lessons, notes, chat, phrase bank; queue queries |
| `conversation.ts` (server-only) | One chat turn |
| `notes.ts` (server-only) | Notes → cards + exercises |
| `streak.ts` | Streak and per-skill level summary for the dashboard |
| `actions.ts` | Server actions for all of the above |

### Mock support

`generateJSON` gets one optional option, `mockFixture: () => unknown`. Only the
mock adapter uses it: it returns the fixture instead of its schema-driven
filler. The generic filler can't produce consistent exercises (an answer that
matches its blank, a placement staircase with every level present), and fixtures
keep the mock lessons readable. Real providers ignore it; validation is unchanged.

### AI reply schemas (`schemas.ts`)

- `LessonSchema`: `title`, `objectives` (2–3), `explanation` { `intro`,
  `points` [{ `heading`, `text`, `examples` [{ `fr`, `en` }] }] 2–4, `pitfalls` },
  `vocabulary` [{ `fr`, `en`, `gender?`, `exampleFr`, `exampleEn` }] 8–12,
  `exercises` 8–10, `grammarCards` [{ `sentence` (one `___`), `answer`, `rule` }] 3,
  `task` { `kind` writing | speaking, `promptFr`, `promptEn`, `minWords`,
  `maxWords`, `points` }, `takeaways` 3. Refinements: unique vocabulary, at
  least 4 exercise types, answer indexes in range, one blank per blank sentence.
- `ExerciseSchema` (discriminated on `type`): `mcq` { `prompt`, `options` 3–4,
  `answer`, `explanation` } · `blank` { `sentence`, `answers` 1–3, `hint?`,
  `explanation` } · `reorder` { `sentence`, `translation` } · `translate`
  { `en`, `answers` 1–3, `explanation` } · `listen` { `audio`, `question`,
  `options` 3–4, `answer`, `explanation` }.
- `TaskFeedbackSchema`: `score` 0–20, `cefr` A1–C1, `strengths`, `corrected`,
  `fixes` (3, shared `fixesSchema`), `summary`.
- `PlacementPoolSchema`: `items` 12, each { `skill`, `stem`, `passage?`,
  `audio?`, `options` 4, `answer`, `explanation` }; refined to 3 per skill.
- `ChatTurnSchema`: `reply`, `replyEn`, `correction` { `ok`, `corrected`,
  `notes` [{ `wrong`, `right`, `why` }] ≤ 3 }, `newWords` [{ `fr`, `en` }] ≤ 3,
  `ended`.
- `UnitSuggestionsSchema`: `units` 1–5 [{ `level` A1–B2, `title`, `grammar`,
  `vocabulary`, `skillFocus` }].
- `NotesSchema`: `cards` [{ `kind`, `front`, `back`, `example?` }] 1–30,
  `exercises` 0–10 (`ExerciseSchema`).

### Routes (all `instant = false`, `notFound()` unless `lang === "fr"`)

| Route | Page |
|---|---|
| `/[lang]/learn` | Course dashboard |
| `/[lang]/learn/placement` | Placement test and last result |
| `/[lang]/learn/units/new` | Add units (AI suggestions or by hand) |
| `/[lang]/learn/units/[unitId]/edit` | Edit or delete an added unit |
| `/[lang]/learn/units/[unitId]` | Unit overview: two lessons, progress |
| `/[lang]/learn/lessons/[lessonId]` | Lesson player (`generateStaticParams` from the syllabus) |
| `/[lang]/learn/checkpoint/[level]` | Level checkpoint quiz |
| `/[lang]/learn/review` | Daily review queue |
| `/[lang]/learn/chat` | Scenarios + past conversations |
| `/[lang]/learn/chat/[conversationId]` | One conversation |
| `/[lang]/learn/notes` | Paste notes, list of imports |
| `/[lang]/learn/notes/[noteId]` | Cards preview + exercises of one import |

### Components (`src/components/course/`)

`CourseDashboard`, `UnitList`, `LevelBars`, `StreakBadge`, `PlacementRunner`,
`PlacementResult`, `LessonPlayer` (steps), `Explanation`, `VocabList` +
`SpeakButton`, `ExerciseRunner` with `McqExercise`, `BlankExercise`,
`ReorderExercise`, `TranslateExercise`, `ListenExercise`, `LessonTask` (writing
editor / speaking recorder reuse), `LessonSummary`, `ReviewSession` +
`ReviewCardView`, `ChatWindow` + `ChatMessage` + `CorrectionNote`,
`NotesImportForm`, `NoteCardsPreview`, `UnitForm`, `GeneratingNotice`.

## Build steps

Each step is buildable and committable alone; after each: lint, build, a
browser test with `AI_PROVIDER=mock`, tick in `PROGRESS.md`, commit.

1. Plan: this document, Phase 9 in `CLAUDE.md` and `PROGRESS.md`.
2. Syllabus + scenarios JSON (hand-written topics), loader with validation,
   `/fr/learn` skeleton with the unit list, nav link (French track only),
   dashboard card.
3. AI plumbing: `mockFixture` option in `generateJSON` + mock adapter, course
   schemas, prompts and fixtures.
4. Lessons: `CourseLesson` + `LessonAttempt` migration, `getOrCreateLesson`,
   lesson page with explanation and vocabulary (TTS), unit page.
5. Exercises: the five exercise types, local checking, results saved in
   `LessonAttempt`.
6. Mini task + summary: AI grading of the writing/speaking task, summary screen,
   lesson completion.
7. Placement: pool generation, adaptive runner, result and starting unit.
8. Spaced repetition: `ReviewCard`, `StudyDay`, `CourseSettings` migration, SM-2,
   cards from finished lessons, `/fr/learn/review`.
9. Phrase bank sharing: "Add to daily review", saved phrases auto-added,
   self-test counted as review.
10. Conversation partner: model, chat turn, page with corrections, speech input,
    optional TTS, save to cards.
11. Notes import: model, notes → cards + exercises, preview and practice pages.
12. Level checkpoints: quiz from cached exercises.
13. Course dashboard complete: current unit, streak, due count, level per skill
    vs B2; `/api/export` includes course tables.
14. Add units: `CourseUnit` migration, AI suggestions + hand form, edit/delete,
    merged into the unit list.
15. README section, full mock-mode browser run, code review and fixes.
