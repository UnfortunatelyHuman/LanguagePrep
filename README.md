# PR Language Prep

Personal practice app for the two language tests on the Canadian PR (Express Entry) path.

| Track | Test | Goal |
|---|---|---|
| English | CELPIP-General | 10 in every skill (CLB 10) |
| French | TCF Canada | NCLC 7 in every skill |

IRCC scores each of the four skills separately, so every skill needs to clear the bar on its own.

## Status

**Phase 1 (scaffold) is done:** Next.js App Router app, an EN/FR track switch, a home
dashboard showing the exam format and target for each skill, and a SQLite database
with the `Attempt` / `Response` models behind it.

Phases 2–7 — reading, listening, writing, speaking, progress charts and extras —
are still to come. See `CLAUDE.md` for the full plan.

## Running it

```bash
npm install          # also runs `prisma generate`
cp .env.example .env # DATABASE_URL for the local SQLite file
npm run db:migrate   # create prisma/dev.db
npm run dev
```

Open http://localhost:3000 — it redirects to `/en`. The French dashboard is at `/fr`.

Use Chrome or Edge: later phases rely on the Web Speech API for listening audio and
speaking transcription.

## Layout

```
src/app/[lang]/     dashboard per track ("en" | "fr")
src/components/     header, track switch, skill cards
src/lib/exams.ts    exam formats and targets — the single source of truth
src/lib/attempts.ts attempt queries
src/lib/prisma.ts   Prisma client (better-sqlite3 adapter)
prisma/schema.prisma
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | production build (also typechecks) |
| `npm run lint` | ESLint |
| `npm run db:migrate` | create and apply a migration |
| `npm run db:studio` | browse the database |

## Notes

- Scores and levels in the app are practice estimates for your own study, not official
  CELPIP or TCF results.
- The TCF band minimums in `src/lib/exams.ts` are approximate — verify current
  thresholds on canada.ca.
- `.env` and `.env.local` are gitignored. `ANTHROPIC_API_KEY` goes in `.env.local`
  from phase 4 onward.
- Database reads go through `await io()` so attempt history is read per request
  instead of being baked into the prerendered shell (better-sqlite3 is a
  synchronous driver).
