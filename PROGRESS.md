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
- [ ] Code review (agents) and fixes

## In flight
- Phase 7 committed; code review of phases 4–7 (agents) + fixes next
