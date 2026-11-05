# PR Language Prep

Personal practice app for the two language tests on the Canadian PR (Express Entry) path.

| Track | Test | Goal |
|---|---|---|
| English | CELPIP-General | 10 in every skill (CLB 10) |
| French | TCF Canada | NCLC 7 in every skill |

IRCC scores each of the four skills separately, so every skill needs to clear the bar on its own.

## Status

All seven build phases in `CLAUDE.md` are done: reading, listening, writing and speaking
practice, progress charts, a study plan, mock exams, a phrase bank and AI-generated sets.
There is also an **Exam guide** (`/en/guide`, `/fr/guide`) covering each test's structure,
timing, scoring and strategies, and every reading/listening paper has an **answer key**
(`…/answers`) for untimed study.

Built-in papers: CELPIP 2 reading + 2 listening; TCF Canada 3 reading + 3 listening
(39 questions each, A1 → C2).

## Features at a glance

- **Dashboard**: today's next step from the study plan, a CLB/NCLC ladder for each skill against
  your target, a "ready to book?" verdict (every skill at target over its last 3 attempts), and a
  practice streak with a 16-week activity heatmap.
- **Mistakes notebook** (`/en/review`, `/fr/review`): every reading/listening question you got
  wrong, most-missed first, with its passage or replayable clip. Retry 10 at a time; a mistake
  moves to *Learned* after two right retries in a row, or when you get it right in a later test.
- **CRS points** (`/en/crs`): the language-related Express Entry points for your practice levels
  or targets (first and second language, French bonus, education/foreign-experience
  transferability), plus which skill's next level is worth the most points. Tables from
  canada.ca's CRS criteria, checked 5 Nov 2026. Re-check them if IRCC changes the system.
- **French accent bar** in TCF writing, like the one on the real computer-based test.
- **Light / dark / system theme** (header button), and a bottom tab bar on phones. The tab bar
  hides during a test so a stray tap can't lose your answers.
- Exam guide, phrase bank, study plan, mock exams, AI-generated sets and your own papers, as before.

## Using it on your phone

On the same Wi-Fi as your Mac:

```bash
npm run phone        # builds, then serves on your network
```

Then open `http://<your-Mac's-IP>:3000` on the phone (find the IP in System Settings → Wi-Fi →
Details). Use Safari's Share → **Add to Home Screen** to open it like an app. Set `APP_PASSWORD`
in `.env.local` first if you're on a shared network. Reading, listening and writing work fully.
Browsers only allow the microphone on `https` or `localhost`, so practise **speaking** on the Mac.

## Adding your own papers

Open **My papers** in the app. You can either:

- **Use the form**: paste each text (reading) or type each script as `Speaker: line`
  (listening), add the questions and mark the correct option; or
- **Import JSON** in the same format as the files in `content/{celpip,tcf}/{reading,listening}/`
  (the My papers page has a template to download).

Papers you add are stored in the SQLite database (the `GeneratedSet` table, `source = "user"`).
They're timed, scored, tracked in your progress and get an answer key, like the built-in ones.
To add a paper to the app's own content instead, put a JSON file in `content/` and import it
in `src/lib/practice/content.ts`. Full-length papers must have exactly 38 (CELPIP) or
39 (TCF) questions, and the build checks this.

## AI providers

All AI calls (writing and speaking feedback, the TCF examiner, generated sets) go through
`generateJSON()` in `src/lib/ai/`. Settings go in `.env.local`; see `.env.example`.

| `AI_PROVIDER` | What it uses |
|---|---|
| `gemini` (default) | `GEMINI_API_KEY`. Models from `AI_MODEL`, or the built-in list: 3.8/3.7/3.6/3.5 Flash, 2.5 Flash, then the Flash-Lite models. Free-tier quotas are per model, so the list keeps working as models run out. |
| `openai-compatible` | Any OpenAI-style `/chat/completions` server (Groq, OpenRouter, Ollama, LM Studio…): `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`. Uses structured output, and switches to JSON mode for servers that don't support it. |
| `mock` | Realistic fake feedback, no network and no quota. Use it for all automated tests: `AI_PROVIDER=mock npm run dev`. `AI_MOCK_ERROR=rate_limit` or `overloaded` simulates failures. |
| `anthropic` | Stub, not finished. |

**Fallback.** With `AI_FALLBACK_PROVIDERS=openai-compatible` and `AI_FALLBACK_MODEL=…`,
when every model of the main provider is out of quota (429), overloaded or timing out,
the request moves to the fallback provider and its models. Bad keys and config errors
don't fall back, so they stay visible. Example with Groq:

```bash
AI_FALLBACK_PROVIDERS=openai-compatible
AI_BASE_URL=https://api.groq.com/openai/v1
AI_API_KEY=...            # your Groq key
AI_FALLBACK_MODEL=openai/gpt-oss-120b,qwen/qwen3.8-27b
```

Speaking is graded from the browser's transcript, never from the audio, so it works the
same with every provider; recordings are only kept for playback.

`GEMINI.md` imports `CLAUDE.md`, so Gemini CLI follows the same project plan.

## Running it

```bash
npm install          # also runs `prisma generate`
cp .env.example .env # DATABASE_URL for the local SQLite file
npm run db:migrate   # create prisma/dev.db (run again after pulling new migrations)
npm run dev
```

Open http://localhost:3000 — it redirects to `/en`. The French dashboard is at `/fr`.

Use Chrome or Edge: later phases rely on the Web Speech API for listening audio and
speaking transcription.

## Layout

```
src/app/[lang]/     pages per track ("en" | "fr")
src/components/     header, nav, dashboard, practice runners, review, CRS
src/fonts/          bundled Atkinson Hyperlegible fonts (SIL OFL), so builds work offline
src/lib/crs.ts      CRS language-points tables and maths (pure)
src/lib/review.ts   mistakes notebook queries
src/lib/exams.ts    exam formats and targets — the single source of truth
src/lib/attempts.ts attempt queries
src/lib/prisma.ts   Prisma client (better-sqlite3 adapter)
prisma/schema.prisma
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | dev server |
| `npm run phone` | production build served on your Wi-Fi network, for your phone |
| `npm run build` | production build (also typechecks) |
| `npm run lint` | ESLint |
| `npm run db:migrate` | create and apply a migration |
| `npm run db:studio` | browse the database |

## Notes

- Scores and levels in the app are practice estimates for your own study, not official
  CELPIP or TCF results.
- The TCF band minimums in `src/lib/exams.ts` are approximate — verify current
  thresholds on canada.ca.
- `.env` and `.env.local` are gitignored; API keys go in `.env.local`.
- Database reads go through `await io()` so attempt history is read per request
  instead of being baked into the prerendered shell (better-sqlite3 is a
  synchronous driver).
