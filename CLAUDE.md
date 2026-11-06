# PR Language Prep App — CELPIP + TCF Canada

Personal practice app for Canadian PR (Express Entry) language tests.

## Targets
- **English — CELPIP-General: 10 in every skill (CLB 10).** IRCC scores each of the 4 skills separately, so we need a 10 in each one, not just a 10 average.
- **French — TCF Canada: NCLC 7 in every skill** (this unlocks the French CRS bonus and French category draws).
  - Approximate NCLC 7 minimums: Listening 458+, Reading 453+, Writing 10/20, Speaking 10/20 (check these against canada.ca).

## Exam formats the app must mirror
### CELPIP-General (computer-based, about 3 hrs)
| Skill | Structure | Time |
|---|---|---|
| Listening | 8 parts: problem solving, daily-life conversation, information, news item, discussion, viewpoints (plus a practice task) | ~47–55 min |
| Reading | 4 parts: correspondence, diagram, information, viewpoints | ~55–60 min |
| Writing | Task 1: write an email (27 min, 150–200 words). Task 2: survey response, pick an option (26 min, 150–200 words) | 53 min |
| Speaking | 8 tasks: giving advice, personal experience, describing a scene, making predictions, comparing & persuading, difficult situation, expressing opinions, unusual situation. Each has prep time (30–60 s) and speaking time (60–90 s) | ~15–20 min |

### TCF Canada
| Skill | Structure | Time |
|---|---|---|
| Compréhension orale | 39 MCQs, increasing difficulty (A1→C2) | 35 min |
| Compréhension écrite | 39 MCQs, increasing difficulty | 60 min |
| Expression écrite | 3 tasks: short message (60–120 words), article/letter (120–150), argumentative comparison of 2 documents (120–180) | 60 min |
| Expression orale | 3 tasks: guided interview (2 min), interactive role-play with prep (5.5 min), express an opinion (4.5 min) | 12 min |

## Tech stack
- Next.js (App Router) + TypeScript + Tailwind
- Storage: SQLite via Prisma (local first; can switch to Postgres later for hosting)
- Listening audio: browser Web Speech API (`speechSynthesis`), with `en-CA` / `fr-CA` voices
- Speaking: `MediaRecorder` to record, Web Speech API (`SpeechRecognition`) to transcribe, using Chrome or Edge
- AI scoring and feedback for writing and speaking, plus generating new questions, go through a provider-agnostic layer in `src/lib/ai/`. App code calls only `generateJSON(prompt, schema)` from `@/lib/ai` (it returns JSON validated against a zod schema) and never imports a provider SDK directly.
  - `AI_PROVIDER` selects the adapter: `gemini` (default, `@google/genai`, key in `GEMINI_API_KEY`), `anthropic` (`ANTHROPIC_API_KEY`), or `openai-compatible` for OpenRouter/Groq/Ollama (`AI_BASE_URL` + `AI_API_KEY`). `AI_MODEL` picks the model, or a comma-separated fallback list: if a model is overloaded (503) or retired, the next one is tried.
  - `AI_FALLBACK_PROVIDERS` (e.g. `openai-compatible`) with `AI_FALLBACK_MODEL`: when every model of the main provider is out of quota (429) or overloaded, the request moves to the next provider.
  - `AI_PROVIDER=mock` returns realistic fake answers with no API call. **All automated tests must run with `AI_PROVIDER=mock`** so they never use real quota (`AI_MOCK_ERROR=rate_limit|overloaded` simulates failures).
  - Keys live in `.env.local`, which must never be committed.
- Mobile-friendly (responsive) so it can be used on a phone

## Build phases (do in order, commit after each)
1. **Scaffold**: Next.js app, layout with EN/FR switch, home dashboard showing targets. Set up Prisma + SQLite with models: `Attempt` (exam, skill, task, score, estimatedLevel, createdAt), `Response` (text/transcript, feedback JSON).
2. **Reading**: question bank in `/content/{celpip,tcf}/reading/*.json`, timed test runner, auto-scoring, an explanation per question, attempt saved.
3. **Listening**: same runner, with passages read aloud by TTS (replay limits that match the real exam: CELPIP plays once).
4. **Writing**: timed editor with a live word count, then submission to `/api/feedback`. The AI layer scores against the official rubric (CELPIP: content/coherence, vocabulary, readability, task fulfillment, on a 1–12 scale; TCF: 0–20 scale, mapped to NCLC). It returns a score, strengths, a corrected version and 3 concrete fixes.
5. **Speaking**: prep timer, then record timer, then transcript, then AI feedback (fluency, vocabulary, grammar, task completion). Keep the audio for playback.
6. **Progress**: per-skill trend charts, estimated CLB/NCLC vs target, weakest-skill highlight.
7. **Extras**: full mock exams, AI-generated fresh question sets, vocabulary/phrase bank (French connectors, CELPIP email phrases), daily study plan.
8. **UX and new tools**: app shell, dashboard, mistakes notebook, CRS calculator.
9. **French course** (`/fr/learn`, plan in `docs/french-course-plan.md`): A1→B2 course to reach NCLC 7. Hand-written syllabus (topics only) in `content/french-course/`; all lesson content AI-generated on demand through `generateJSON`, validated and cached in the database, never regenerated. Placement test, ~15-minute lessons (explanation, vocabulary with TTS, 8–10 exercises, AI-graded mini task, summary), SM-2 daily review shared with the phrase bank, AI conversation partner, notes import, course dashboard. Every AI call passes a `mockFixture` so `AI_PROVIDER=mock` covers it. Never copy goFluent or other paid material.
   - [x] 9.1 Plan (`docs/french-course-plan.md`)
   - [x] 9.2 Syllabus + scenarios JSON, loader, `/fr/learn` skeleton, nav + dashboard links
   - [x] 9.3 AI plumbing: `mockFixture`, course schemas, prompts, fixtures
   - [x] 9.4 Lessons: `CourseLesson` + `LessonAttempt`, cached generation, explanation + vocabulary (TTS), unit page
   - [x] 9.5 Exercises: MCQ, fill-in, reorder, translate, listen-and-choose; local checking; results saved
   - [x] 9.6 Mini writing/speaking task graded by AI, summary, lesson completion
   - [x] 9.7 Placement test: cached pool, adaptive runner, CEFR per skill, starting unit
   - [x] 9.8 Spaced repetition: `ReviewCard`, `StudyDay`, `CourseSettings`, SM-2, daily review page
   - [x] 9.9 Phrase bank sharing with the review queue
   - [x] 9.10 Conversation partner with corrections, speech input, optional TTS
   - [x] 9.11 Notes import → review cards + exercises
   - [ ] 9.12 Level checkpoints
   - [ ] 9.13 Course dashboard complete (current unit, streak, due, level per skill); export covers course tables
   - [ ] 9.14 Add syllabus units later: AI suggestions (or by hand) saved in `CourseUnit`, edit/delete
   - [ ] 9.15 README, mock-mode browser run, code review + fixes

## Rules
- Content JSON must be original (don't copy official or paid prep material).
- AI score estimates are guidance, not official scores, and the UI should say so.
- Keep secrets out of git (`.env*` in `.gitignore`).
- Write small, readable components; run `npm run lint` and `npm run build` before each commit.
