# Build progress

Working log for the remaining phases (see CLAUDE.md for the spec). If a session
is interrupted, resume from the first unchecked item. Keep this file current:
tick items as they land and note anything half-done under "In flight".

## Done
- [x] Phase 1: scaffold, dashboard, Prisma + SQLite
- [x] Phase 2: reading (CELPIP ×2, TCF ×1)
- [x] Phase 3: listening with TTS (CELPIP ×2, TCF ×1)
- [x] Phase 4: writing with AI feedback; provider-agnostic `lib/ai` with model fallback

## Phase 5: Speaking
- [x] Content: `content/celpip/speaking/set-{1,2}.json` (8 tasks each), `content/tcf/speaking/set-{1..4}.json` (3 tasks each)
- [x] `lib/speaking`: types, content loader + validation, rubric (fluency, vocabulary, grammar, task completion; CELPIP 1–12, TCF 0–20 → NCLC), grader prompt
- [x] Recording: prep timer → record timer (MediaRecorder) → live transcript (SpeechRecognition en-CA/fr-CA), mic permission + unsupported-browser handling
- [x] `/api/speaking/feedback` (multipart: audio + transcripts), audio kept under `data/recordings/` (gitignored), served by `/api/recordings/[responseId]`
- [x] Results + saved review page with audio playback; history
- [x] Routes: `/[lang]/speaking`, `/[lang]/speaking/[setId]`, `/[lang]/speaking/attempts/[attemptId]` (instant = false)

## Phase 6: Progress
- [x] `/[lang]/progress`: per-skill trend charts, latest estimated level vs target, weakest-skill highlight
- [x] Dashboard link

## Phase 7: Extras
- [x] Vocabulary / phrase bank (French connectors, CELPIP email phrases) with search + self-test
- [x] Daily study plan (from attempts: weakest + least recently practised skill; optional exam date)
- [x] Full mock exams (all four skills in order, with progress through the steps)
- [x] AI-generated fresh question sets (writing + speaking prompts via `lib/ai`, validated, saved, runnable)

## Quality gates (after each phase)
- [x] lint + build clean, commit
- [x] Manual browser test as a user (headless Chrome via puppeteer; speaking with stubbed mic/recognition)
- [x] Code review (3 agents: AI/writing/generate, speaking, progress/plan/mock/phrases) and fixes

## Phase 8: UX and new tools
- [x] App shell: grouped nav with More menu, phone tab bar (hidden in test runners), light/dark/system theme, bundled Atkinson Hyperlegible fonts
- [x] Dashboard: today's next step, CLB/NCLC ladders, ready-to-book verdict, streak + heatmap (`lib/today-plan.ts`, `lib/activity.ts`)
- [x] Mistakes notebook with retries (`MistakeReview` model, migration `20261105220000_mistake_review`)
- [x] CRS language-points calculator (`lib/crs.ts`, tables from canada.ca, checked 2026-11-05)
- [x] TCF accent bar in the writing editor; app icon + web manifest; `npm run phone`

## Phase 9: French course (plan: `docs/french-course-plan.md`)
- [x] 9.1 Plan: `docs/french-course-plan.md`, Phase 9 in CLAUDE.md and here (approved 2026-11-06: 10 new cards/day, Regenerate kept, add-units feature added)
- [x] 9.2 `content/french-course/syllabus.json` (36 units A1→B2, topics only) + `scenarios.json`, `lib/course/syllabus.ts` with validation, `/fr/learn` skeleton with unit list, "French course" nav item (French track only), card on the French dashboard
- [x] 9.3 `mockFixture` option in `generateJSON` (mock adapter only), `lib/course/schemas.ts`, `prompts.ts`, `fixtures.ts`
- [x] 9.4 `CourseLesson` + `LessonAttempt` (migration `course_lessons`), `getOrCreateLesson` (generate once, cache), `/fr/learn/lessons/[lessonId]` explanation + vocabulary with TTS, `/fr/learn/units/[unitId]`
- [x] 9.5 Exercise runner: MCQ, fill-in-the-blank, reorder, translate, listen-and-choose; lenient local checking; answers saved
- [x] 9.6 Mini task (writing or speaking transcript) graded by AI on 0–20 + CEFR; summary step; lesson marked complete
- [x] 9.7 `PlacementQuestion` + `PlacementResult` (migration `course_placement`), pool generated once, adaptive staircase (~20 questions), level per skill, starting unit
- [x] 9.8 `ReviewCard`, `StudyDay`, `CourseSettings` (migration `course_review_cards`), `lib/course/srs.ts` SM-2, cards from finished lessons, `/fr/learn/review`
- [x] 9.9 Phrase bank: "Add to daily review", TCF saved phrases auto-added, self-test counts as a review
- [x] 9.10 `Conversation` (migration `course_conversations`), `/fr/learn/chat` scenarios + chat with corrections, speech input, optional TTS, save to cards
- [x] 9.11 `NoteImport` (migration `course_notes`), `/fr/learn/notes` paste → preview cards → add; exercises practised like a lesson
- [x] 9.12 Level checkpoints `/fr/learn/checkpoint/[level]` from cached exercises (70% to pass)
- [x] 9.13 Course dashboard: current unit, streak, due count, level per skill vs B2; `/api/export` includes course tables
- [ ] 9.14 `CourseUnit` (migration `course_units`), `/fr/learn/units/new`: describe → AI suggests 1–5 units → edit/untick → save; hand form without AI; edit/delete; shown at the end of their level
- [ ] 9.15 README section, full browser run with `AI_PROVIDER=mock`, code review + fixes

## In flight
- Phase 9: next is 9.14.
