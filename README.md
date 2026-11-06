# PR Language Prep

A personal practice app for the two language tests on the Canadian PR (Express Entry) path.
It runs on your own computer, keeps all your results there, and uses a free AI key for writing
and speaking feedback.

| Track | Test | Goal |
|---|---|---|
| English | CELPIP-General | **CLB 10 in every skill** |
| French | TCF Canada | **NCLC 7 in every skill** |

IRCC scores each of the four skills (listening, reading, writing, speaking) separately, so every
skill has to reach the target on its own. A high average with one weak skill isn't enough.

> Scores and levels in this app are **practice estimates** for your own study. They are not
> official CELPIP or TCF results.

---

## Contents

1. [First-time setup](#1-first-time-setup)
2. [Starting the app each day](#2-starting-the-app-each-day)
3. [Finding your way around](#3-finding-your-way-around)
4. [A good daily routine](#4-a-good-daily-routine)
5. [Every feature, step by step](#5-every-feature-step-by-step)
   - [Dashboard](#51-dashboard) · [Study plan](#52-study-plan) · [Reading](#53-reading) ·
     [Listening](#54-listening) · [Writing](#55-writing) · [Speaking](#56-speaking) ·
     [Answer keys](#57-answer-keys) · [Mistakes notebook](#58-mistakes-notebook) ·
     [Progress](#59-progress) · [Mock exam](#510-mock-exam) · [Phrase bank](#511-phrase-bank) ·
     [Exam guide](#512-exam-guide) · [CRS points](#513-crs-points) ·
     [New AI sets](#514-new-ai-sets) · [My papers](#515-my-papers) ·
     [French course](#516-french-course)
6. [How scores and levels are estimated](#6-how-scores-and-levels-are-estimated)
7. [Using it on your phone](#7-using-it-on-your-phone)
8. [AI settings](#8-ai-settings)
9. [Your data](#9-your-data)
10. [Troubleshooting](#10-troubleshooting)
11. [For developers](#11-for-developers)

---

## 1. First-time setup

**You need:** a Mac or PC, [Node.js](https://nodejs.org) 20 or newer, Git, and **Chrome or
Edge**. Listening and speaking use the browser's built-in speech features, which work best there.

```bash
git clone https://github.com/UnfortunatelyHuman/LanguagePrep.git
cd LanguagePrep
npm install
cp .env.example .env
npm run db:migrate
```

`npm run db:migrate` creates your local database file (`prisma/dev.db`). If it asks for a
migration name, press Enter.

### Add a free AI key (for writing and speaking feedback)

1. Go to **aistudio.google.com**, choose **Get API key**, then **Create API key**. It's free and
   needs no card.
2. Create a file called `.env.local` in the project folder with:

   ```
   AI_PROVIDER=gemini
   GEMINI_API_KEY=paste-your-key-here
   ```

3. Optional but recommended: add a free **Groq** key (console.groq.com) as a backup for when
   Gemini's daily free quota runs out. See [AI settings](#8-ai-settings).

`.env.local` is never committed to Git. Never paste your key into any other file.

Reading and listening work without any AI key. Only writing feedback, speaking feedback, the
TCF role-play examiner and **New AI sets** need one.

---

## 2. Starting the app each day

```bash
cd LanguagePrep
npm run dev
```

Open **http://localhost:3000** in Chrome or Edge. It opens the English (CELPIP) dashboard; the
French (TCF Canada) dashboard is at **http://localhost:3000/fr**.

Stop it with `Ctrl + C` in the terminal.

**After getting new code** (for example after `git pull`), run these once before `npm run dev`:

```bash
npm install
npm run db:migrate
```

---

## 3. Finding your way around

- **EN / FR switch** (top right): changes between the CELPIP track and the TCF Canada track.
  The English track is blue and the French track is red, so you always know which one you're in.
  Each track keeps its own history, plan and settings.
- **Theme button** (circle icon, top right): cycles between *match system*, *light* and *dark*.
- **On a computer**, the header shows Home, Study plan, Progress, Mistakes and Mock exam (on the
  French track, **French course** takes Mock exam's place, which moves under More). The rest
  (Exam guide, Phrase bank, CRS points, My papers, New AI sets) are under **More**.
- **On a phone**, the same links are in a tab bar at the bottom of the screen. The tab bar hides
  while a test is open, so a stray tap can't take you out of it and lose your answers.

---

## 4. A good daily routine

1. Open the **Dashboard** and press the big **Start** button. That's the most useful thing to do
   today, chosen by the study plan.
2. Do the rest of today's plan (listed under the Start button) if you have time.
3. Spend 5–10 minutes in the **Mistakes notebook** retrying questions you got wrong.
4. Self-test 10 phrases in the **Phrase bank**.
5. In the final week before your exam, take one **Mock exam**. The study plan reminds you.
6. French: one lesson of the **French course** and its **Daily review** (about 20 minutes).

Short daily practice works better than long weekend sessions. The streak on the dashboard is
there to help with that.

---

## 5. Every feature, step by step

### 5.1 Dashboard

The home page of each track. It has four parts.

**Today.** The first step of today's study plan, with a button to start it. Below it are the
other steps for today, with their times. On the right is the number of **days to your exam**
(or *Set exam date* if you haven't set one; click it to go to the study plan settings).

**Where you stand.** One card per skill, showing:
- your **latest level** (for example *CLB 9*) and the **average of your last three attempts**;
- a **ladder** of 12 rising bars (CLB/NCLC 1–12). The bars are filled up to your recent
  average, and the **dashed bar is your target**. Filled bars turn **green** once you're at or
  above target.

Click a card to practise that skill. Under the cards, a short verdict tells you how many skills
are at target, and when it's a good time to **book the real test**: when all four skills have
averaged the target over their last three attempts.

**Practice habit.** Your **current streak** (days in a row with at least one saved attempt), your
**longest streak**, **days practised this week**, and a grid of the last 16 weeks. Darker squares
mean more attempts that day; hover over a square to see the details. Attempts in either language
count.

**Tool shortcuts.** Quick links to the Mistakes notebook, CRS points, Exam guide and My papers.

### 5.2 Study plan

**Study plan** builds a plan for today from your results:

- It puts your **weakest skill** first (the lowest recent average, or a skill you haven't tried
  yet), and skills you haven't practised for a few days next.
- Each step says what to do, how long it takes, why it was chosen, and has a **Start** link.
- It changes as your exam gets closer:
  - **Final week (7 days or fewer):** asks you to take one full mock exam, then target the weak
    spots it showed.
  - **Last 2 days:** light review only, no new full tests.
  - **Exam day:** a quick look at your phrases, then rest.

**Plan settings** (bottom of the page):
- **Exam date:** the date of your booked or planned test. This turns on the countdown.
- **Minutes per day:** how much time you want to study (15–240). The plan fits into it.
- **Time zone:** decides when "today" starts. Choose **Use my browser's** to match your computer.

Each track (EN/FR) has its own exam date and settings.

### 5.3 Reading

Go to **Reading** from the dashboard (or `/en/reading`, `/fr/reading`).

1. Pick a paper from the list. Your previous scores on each paper are shown.
2. Read the intro screen (parts, timing), then press **Start**.
3. Answer the questions:
   - **CELPIP:** 4 timed parts (Correspondence 11 min, Diagram 9, Information 10, Viewpoints
     13; 38 questions). Each part has its own timer. When it runs out, or you finish the part, the
     test moves on and you can't go back, as in the real exam. In the correspondence reply, the
     blanks are dropdowns inside the text.
   - **TCF Canada:** one 60-minute block of 39 questions, from A1 (easiest) to C2 (hardest). You
     can move freely between questions.
4. When you submit, the server scores the test (the answers never reach your browser before you
   submit) and shows:
   - your **estimated level** against the target;
   - a breakdown **by part** (CELPIP) or **by difficulty level** (TCF);
   - every question with **the right answer and an explanation**, plus a **Mistakes only** filter.

Every wrong answer also goes to the [Mistakes notebook](#58-mistakes-notebook).

**Built-in papers:** CELPIP 2 full papers; TCF Canada 3 full papers. You can add more with
[New AI sets](#514-new-ai-sets) or [My papers](#515-my-papers).

> Count only your **first** attempt at a paper as a real estimate. On repeat attempts you
> remember the answers.

### 5.4 Listening

Same flow as reading, with audio read aloud by your browser's voices.

1. On the intro screen, press **Sound check** first. It plays a short sample and tells you whether
   Canadian English and French voices are installed.
2. Press **Start**, then press **Play** for each clip. Browsers don't allow audio to start by itself.
3. Rules, as in the real tests:
   - **Each clip plays once**: no pause, no replay. Leaving the screen mid-clip uses up the play.
   - **CELPIP:** the questions appear only after the clip ends. 6 scored parts, 38 questions.
   - **TCF Canada:** you see the question first. 39 questions in 35 minutes, A1 → C2.
   - You can only move forward.
4. The results page shows your level, the breakdown, explanations, and the **transcript** of
   every clip, which you can replay there.

Different speakers get different voices. If your computer has few voices, the app changes the
pitch so speakers still sound different.

**Better voices:** Edge's "Natural" voices and macOS's *Amélie* (French, Canada) sound much more
human than the defaults. See [Troubleshooting](#10-troubleshooting) for how to install them.

> Synthetic voices are clearer and steadier than real exam recordings, so treat listening scores
> here as slightly optimistic. Also listen to real Canadian audio (CBC Radio, Radio-Canada /
> ICI Première) each week.

### 5.5 Writing

Needs an AI key.

1. Go to **Writing** and choose a prompt (CELPIP) or a paper (TCF).
   - **CELPIP Task 1, Email:** 27 minutes, 150–200 words. 6 built-in prompts.
   - **CELPIP Task 2, Survey response:** 26 minutes, 150–200 words. Pick option A or B and argue
     for it. 6 built-in prompts.
   - **TCF Canada:** all 3 tasks on one shared 60-minute timer: a message (60–120 words), an
     article or letter (120–150), and a comparison of two opposing documents (120–180). Use the
     **Tâche 1 / 2 / 3** tabs to move between them. 4 built-in papers.
2. Write in the editor:
   - The **word count** updates as you type and turns green when you're in range.
   - **Spell check is off**, as in the real exams.
   - **French accent bar (TCF):** click é, è, ç, œ, « », capitals and more to insert them where
     your cursor is, like the on-screen bar in the real TCF. On a Mac you can also hold a letter
     key to pick an accent.
3. Press **Submit**, or the test submits itself when time runs out. Grading takes about
   15–60 seconds.
4. The feedback shows:
   - a **score for each rubric area** (CELPIP: 1–12; TCF: 0–20) and your **estimated
     CLB/NCLC level**;
   - your **strengths**;
   - **3 concrete fixes**, each quoting what you wrote and how to say it better. Press
     **+ Save to phrase bank** on a fix to add it to your [Phrase bank](#511-phrase-bank);
   - a **corrected version** of your text, with removed and added words highlighted. For TCF, the
     feedback is in English and the corrections are in French.

If grading fails (no key, quota used up, AI busy), your text stays on screen with **Try again**,
and **Keep writing** if time is left. Every attempt is saved; open it again from the history list
on the Writing page.

The grading is deliberately strict: levels round **down** (a 9.5 average is CLB 9), and
repeated basic errors cap the score.

### 5.6 Speaking

Needs an AI key, a microphone, and **Chrome or Edge**.

1. Go to **Speaking** and choose a set. Allow microphone access when the browser asks.
2. For each task: a **preparation countdown** → recording starts automatically → it stops when
   speaking time is up. A live transcript appears as you speak.
   - **CELPIP:** all 8 tasks with the real prep (30–60 s) and speaking (60–90 s) times: giving
     advice, personal experience, describing a scene, making predictions, comparing and
     persuading, a difficult situation, expressing opinions, an unusual situation. In **Task 5**,
     after you choose, a third option that "someone else prefers" appears, as in the real test,
     and you argue against it. 2 built-in sets.
   - **TCF Canada:** Tâche 1 guided interview (2 min); Tâche 2 role-play (2 min prep +
     3.5 min), where an **AI examiner plays the other person aloud** and answers your questions;
     Tâche 3 opinion (4.5 min). 4 built-in sets.
3. Listen back to your recording, then get feedback:
   - a score per area (fluency, vocabulary, grammar, task completion) and your estimated level;
   - words per minute, strengths, 3 fixes quoting what you said (save them to the phrase bank);
   - an **improved version** of each answer, to read aloud and copy.

Grading uses the browser's transcript (not the audio), so it works with every AI provider.
Recordings are kept on your computer for playback from the history page.

### 5.7 Answer keys

Every reading and listening paper has an answer key: press **Study with answers** next to the
paper in the list. It's an untimed study view with all answers, explanations,
replayable audio and scripts. Press **Quiz me** to hide the answers and check them one at a time.
Nothing here is saved or scored, so it's safe for studying a paper you've already taken.

### 5.8 Mistakes notebook

**Mistakes** collects every reading and listening question you've answered wrong in a saved
test, **most-missed first**.

- Each mistake shows the question, **what you picked**, **the right answer**, the explanation, and
  **Show the passage** / **Hear the clip again** for context.
- Filter by **All / Reading / Listening**, and switch between **To fix** and **Learned**.
- Press **Retry** for a session of up to 10 questions, one at a time. Pick an answer to
  see right or wrong plus the explanation, then **Next question**.
- A mistake moves to **Learned** when you get it right **twice in a row** in retries, or
  **right in a later full test**. A wrong retry resets it.

### 5.9 Progress

**Progress** shows, for each skill:
- a **trend chart** of your estimated level over time, with the target line;
- your latest level, recent average and change;
- the **Focus next** box: your weakest skill and why.

At the bottom, **Your data** lets you **download all your data** as a JSON file (a backup of all
attempts, feedback, settings and saved phrases for both exams). You can delete single attempts
from each skill's history.

### 5.10 Mock exam

**Mock exam** runs all four skills in exam order, using the paper you've attempted least
recently for each.

1. Press **Start a new mock exam**. A checklist of the four steps appears.
2. Take each step from its link. A step ticks itself off when you save an attempt at that paper.
3. When all four are done, you see the levels together, like a real score report.

You can leave and come back: the mock exam keeps your place. Past mocks are listed on the same
page. Take one full mock exam in your final week, under real conditions: quiet room, in one
sitting, no pauses.

### 5.11 Phrase bank

Ready-made phrases that save time and lift vocabulary and coherence scores.

- **CELPIP:** email openings, stating the purpose, complaining politely, requests and suggestions,
  closings, opinions and concessions, and speaking fillers and transitions.
- **TCF Canada:** connectors for cause and consequence, opposition and concession, addition and
  conclusion; giving your opinion, structuring a talk, letter and email formulas, polite
  questions, and qualifying your point.
- **Saved from feedback:** fixes you saved from writing and speaking feedback.

Use **Search phrases** to find one, or pick a category. **Self-test** shows what a phrase is
for ("Which phrase fits?"); try to recall it, reveal it, then mark **I knew it** or
**Still learning**. Phrases you're still learning come up first next time.

### 5.12 Exam guide

**Exam guide** explains every part of the test: structure, timing, how it's scored, what each
question type tests, strategies, the score you need for CLB 10 / NCLC 7, test-day tips, and how to
prepare with this app. Read it once before your first practice test.

### 5.13 CRS points

**More → CRS points** shows what your English and French levels are worth in Express Entry's
Comprehensive Ranking System (CRS).

1. Choose **My practice** (your recent practice levels) or **My targets** (CLB 10 + NCLC 7), or
   set any level by hand to try a scenario.
2. Set **spouse or partner coming with you**, **highest education** and **work experience
   outside Canada**. These change the language points.
3. The panel shows your **language-related CRS points**, what you'd have **at your targets**, and
   the breakdown:
   - first official language (whichever of English and French is worth more);
   - second official language;
   - the **French-ability bonus** (up to 50 points for NCLC 7+ in all four French skills with
     CLB 5+ in English);
   - education + language and foreign experience + language (these need CLB 7+ in all four
     skills, and double at CLB 9+).
4. **Where the next points are** lists the changes worth the most, for example "English writing
   8 → 9: +32" or "All four French skills at NCLC 7: +57". This helps you decide which skill to
   practise next.

The tables come from IRCC's
[CRS criteria](https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/check-score/crs-criteria.html)
(checked 5 November 2026). This covers language-related points only: age, education, Canadian
experience, job offers and nominations add the rest. Check IRCC's own tool before making
decisions.

### 5.14 New AI sets

**More → New AI sets** creates fresh practice material with AI, so repeat attempts stay honest.

- **English:** writing Task 1 email, writing Task 2 survey, full 8-task speaking test, listening
  mini test (2 parts, 13 questions), reading mini test (2 parts, 21 questions).
- **French:** full Expression écrite paper (3 tasks), speaking set, and listening and reading mini
  tests (13 questions from A1 to C2, scored on the 100–699 scale).

Choose a type, optionally type a theme (for example "winter driving" or "le télétravail"), and
press **Generate and open**. It takes 20–60 seconds. The new set appears in the list
and in the matching skill's page, and is timed, scored and tracked like the built-in ones. Mini
tests are shorter than the real exam, so use them for practice and full papers for estimates.

### 5.15 My papers

**More → My papers** lets you add reading or listening papers from a prep book or class.

- **With the form:** paste each text (reading), or type each script as `Speaker: line`
  (listening). Add the questions and mark the correct option.
- **As JSON:** download the template from the page, fill it in, and import it.

Your papers are timed, scored, tracked in your progress, get an answer key, and can be edited or
deleted. They're stored only in your local database.

### 5.16 French course

On the French track, **French course** (in the header, or the card on the French dashboard)
takes you from your current level to **B2**, the level behind NCLC 7, in 36 units of two
15-minute lessons. Everything in it is original and written by AI; nothing is copied from paid
courses.

- **Placement test:** about 20 questions (grammar, vocabulary, reading, listening) that get
  harder when you're right and easier when you're not. You get a CEFR level per skill (A1–C1) and
  the unit to start from. The questions are written once (5 AI requests in all) and reused.
- **Lessons:** a short explanation in English with French examples, vocabulary with audio,
  8–10 exercises (multiple choice, fill-in-the-blank, reorder words, translate, listen and choose)
  checked on your device, then a small writing or speaking task graded by AI on the TCF 0–20
  scale, and a summary. A lesson is written by AI the first time you open it (about a minute,
  one request) and saved, so it never costs quota again and works offline. If one comes out
  wrong, **Regenerate** at the bottom rewrites it.
- **Daily review:** words, grammar and phrases from your lessons come back just before you'd
  forget them (spaced repetition, SM-2). Up to 10 new cards a day (change it at the bottom of
  the page). French phrase-bank entries have **+ Add to daily review**, phrases you save from TCF
  feedback join automatically, and a phrase-bank self-test counts as a review.
- **Conversation:** role-play a scenario (bakery, landlord, job interview, a debate…) or chat
  freely, by typing or speaking. After each message you get a gentle correction and new words,
  which you can add to your review. One AI request per message.
- **My notes:** paste notes from your classes (goFluent or anything else). The AI turns them into
  review cards and exercises from only what you pasted; untick cards you don't want.
- **Checkpoints:** at the end of each level, a quiz from that level's lessons (no AI request);
  70% marks the level as done.
- **Add units:** **Add units** on the course page extends the syllabus. Describe what you want
  ("more B2 workplace units") and the AI suggests units, or write your own. Added units can be
  edited or deleted.
- **Course dashboard:** where to continue, your streak, cards due, lessons done, and an estimated
  level per skill against the B2 target.

---

## 6. How scores and levels are estimated

- **Reading and listening:** CELPIP uses the commonly cited raw-score-out-of-38 → CLB chart
  (about 33/38 for CLB 10 in reading). TCF questions are worth more as they get harder (3 points
  for A1 up to 33 for C2, 100–699 in total) and are mapped with IRCC's NCLC table (reading
  NCLC 7 = 453–498, listening NCLC 7 = 458–502).
- **Writing and speaking:** the AI grades against the official rubric areas, rounds down, and caps
  scores for repeated basic errors. The band descriptions are our own wording of the published
  criteria, not the official descriptors.
- **Use them as a trend, not a promise.** Compare your attempts over time. If two similar pieces
  of work get very different scores, trust the average.

Neither CELPIP nor TCF publishes an exact conversion table, so check the current thresholds on
canada.ca before you book.

**French course levels (A1–C1)** are rougher guides:

- **Grammar, vocabulary, reading, listening:** from your latest placement test. A skill's level
  is the highest level where you got at least 2 questions right. Passing a level checkpoint raises
  grammar and vocabulary to that level.
- **Writing and speaking:** the middle of your last 3 estimates, from lesson tasks (graded on the
  TCF 0–20 scale) or TCF writing/speaking practice, whichever is higher. NCLC is converted roughly:
  7–8 ≈ B2, 5–6 ≈ B1, 4 ≈ A2, 9+ ≈ C1.

---

## 7. Using it on your phone

On the same Wi-Fi as your computer:

```bash
npm run phone
```

This builds the app and serves it on your network. On the phone, open
`http://<your-computer's-IP>:3000`. On a Mac, find the IP in System Settings → Wi-Fi → Details.

- In Safari, press **Share → Add to Home Screen** to open it full-screen like an app.
- On a shared network, set a password first: add `APP_PASSWORD=choose-a-long-password` to
  `.env.local`. The browser will then ask for it (any user name).
- Reading, listening and writing work fully on the phone. Browsers only allow the microphone on
  secure (`https`) pages or `localhost`, so **practise speaking on the computer**.

To develop or chat with Claude from your phone while away, see Claude Code's Remote Control, or
work from GitHub in Claude Code on the web.

---

## 8. AI settings

All AI settings go in `.env.local`. The full list with comments is in `.env.example`.

| Setting | What it does |
|---|---|
| `AI_PROVIDER` | `gemini` (default), `openai-compatible` (Groq, OpenRouter, Ollama, LM Studio…), `mock` (fake answers, no key needed), `anthropic` (not finished) |
| `GEMINI_API_KEY` | Your Google AI Studio key |
| `AI_MODEL` | One model, or a comma-separated list tried in order. Leave it unset to use the built-in Gemini list. On the free tier, each model has its own daily quota, so a longer list lasts longer |
| `AI_FALLBACK_PROVIDERS` | Provider to switch to when every main model is out of quota or overloaded, e.g. `openai-compatible` |
| `AI_FALLBACK_MODEL` | Model(s) for the fallback provider |
| `AI_BASE_URL`, `AI_API_KEY` | Address and key for an `openai-compatible` provider |
| `APP_PASSWORD` | Optional password for every page, for when others can reach the app |

**Example with Gemini plus a free Groq backup:**

```
AI_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-key
AI_FALLBACK_PROVIDERS=openai-compatible
AI_BASE_URL=https://api.groq.com/openai/v1
AI_API_KEY=your-groq-key
AI_FALLBACK_MODEL=openai/gpt-oss-120b
```

Check Groq's and Google's model lists for current model names; old models get retired. If a
model in your list is retired, the app tells you and moves on to the next one.

**How the French course uses quota:** each lesson costs one request the first time you open it,
then it's saved for good. The placement questions cost 5 requests once. Each lesson task grade,
conversation message, unit suggestion and notes import (per ~5,000 characters) is one request.
Daily review, exercises and checkpoints never use AI.

**Testing without using quota:** `AI_PROVIDER=mock npm run dev` returns realistic fake feedback,
and fake French lessons, placement questions, chats and notes. The mock ignores `AI_MODEL`, so
nothing it writes claims to come from a real model. `AI_MOCK_ERROR=rate_limit` (or `overloaded`)
simulates failures. Lessons and placement questions made in mock mode are saved like real
ones; delete them before switching back if you tried the course in mock mode.

**Privacy:** on Gemini's free tier, Google may use what you send to improve its products. Don't
type personal details into writing or speaking tasks.

---

## 9. Your data

- Everything is stored **on your computer** in `prisma/dev.db` (a SQLite file). Speaking
  recordings are in `data/recordings/`. Neither is ever committed to Git.
- **Back up** regularly: Progress → **Download all my data (JSON)**, or copy `prisma/dev.db`.
  The download includes the French course (lessons, cards, conversations, notes).
- **Delete** single attempts from each skill's history list (recordings are deleted with them).
- Your light/dark theme choice is remembered in your browser only.
- Your AI key stays in `.env.local` on your computer.

---

## 10. Troubleshooting

| Problem | Fix |
|---|---|
| **No sound in listening** | Use Chrome or Edge, press **Sound check**, check the volume, and press **Play**. Browsers block audio that starts by itself. |
| **French sounds like an English voice** | Install a French (Canada) voice. **Mac:** System Settings → Accessibility → Spoken Content → System voice → Manage Voices → French (Canada) → *Amélie*. **Windows:** Settings → Time & language → Speech → Add voices → *Français (Canada)*. Or use Edge's Natural voices. Restart the browser afterwards. |
| **Microphone blocked** | Click the lock icon in the address bar → allow Microphone, then reload. On a Mac also check System Settings → Privacy & Security → Microphone. |
| **No live transcript while speaking** | Speech-to-text needs Chrome or Edge and an internet connection. |
| **"Quota" / 429 error in feedback** | The free daily quota is used up. Wait for the reset, add more models to `AI_MODEL`, or set up the Groq fallback ([AI settings](#8-ai-settings)). |
| **"Model no longer available"** | Google retired that model. Put a current model name in `AI_MODEL`, or remove the line to use the built-in list. |
| **"High demand" / 503** | Gemini is overloaded. The app retries automatically; press **Try again** a little later. |
| **Feedback says the key is missing** | Check `.env.local` is in the project folder with `GEMINI_API_KEY=…`, then restart `npm run dev`. |
| **Error about a missing table or column** | Run `npm run db:migrate`, then restart `npm run dev`. |
| **`Port 3000 is in use`** | Another copy is running. Stop it with `Ctrl + C`, or open the address the terminal shows instead. |
| **`git` errors like `src refspec # does not match any`** | Your terminal (zsh) doesn't treat `#` as a comment. Run commands without anything after them, or run `echo 'setopt interactive_comments' >> ~/.zshrc` once. |
| **`git` says a `.lock` file exists** | Make sure no other Git command is running, then delete the named `.lock` file in `.git/`. |
| **"Preparing your lesson…" fails** | The AI couldn't answer (quota, overload). Press **Try again**; nothing was saved, so it costs nothing extra. If it keeps failing, see the quota row above. |
| **A lesson has a mistake or doesn't match the unit** | Use **Regenerate** at the bottom of the lesson (one request). Edited units keep their old lessons until you regenerate them. |
| **Placement test or course pages show an error after updating** | Run `npm run db:migrate`, then restart `npm run dev`. |
| **Speaking or the 🎤 button does nothing in the conversation** | Speech input needs Chrome or Edge and microphone access; you can always type instead. |
| **The page looks stuck after an update** | Stop the server, run `npm install` and `npm run db:migrate`, then `npm run dev` again. |

---

## 11. For developers

The build plan and rules are in `CLAUDE.md`. `GEMINI.md` and `AGENTS.md` point AI coding tools
to it, and `PROGRESS.md` is the build log.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server at http://localhost:3000 |
| `npm run phone` | Production build served on your Wi-Fi network |
| `npm run build` | Production build (also typechecks) |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply (or create) database migrations |
| `npm run db:studio` | Browse the database in the browser |

Run `npm run lint` and `npm run build` before each commit. Automated tests must use
`AI_PROVIDER=mock`.

### Layout

```
content/                 built-in papers, prompts and phrases (JSON, all original)
prisma/schema.prisma     database models; migrations in prisma/migrations/
src/app/[lang]/          pages per track ("en" | "fr")
src/components/          header and nav, dashboard, practice runners, writing,
                         speaking, review, CRS, phrases, plan, mock, papers
src/fonts/               bundled Atkinson Hyperlegible fonts (SIL OFL), so builds work offline
src/lib/exams.ts         exam formats and targets: the single source of truth
src/lib/ai/              provider-agnostic AI layer: generateJSON(prompt, schema)
src/lib/practice/        reading/listening content, scoring, speech
src/lib/writing/         writing content, rubric, grading
src/lib/speaking/        speaking content, rubric, grading, recordings
src/lib/study-plan.ts    the daily plan (pure); today-plan.ts loads its inputs
src/lib/activity.ts      streak and heatmap
src/lib/review.ts        mistakes notebook
src/lib/crs.ts           CRS language-points tables and maths (pure)
src/lib/course/          French course: syllabus, AI schemas/prompts/fixtures, lessons,
                         placement, SM-2 review, conversation, notes, checkpoints, units
content/french-course/   syllabus.json (36 units, topics only) and scenarios.json
```

The French course plan is in `docs/french-course-plan.md`. Every course AI call passes a
`mockFixture`, so `AI_PROVIDER=mock` exercises all of it without quota.

### Adding built-in content

Put a JSON file in `content/{celpip,tcf}/{reading,listening,writing,speaking}/`, in the same
format as the existing files, and import it in the matching `content.ts` loader
(e.g. `src/lib/practice/content.ts`). Full reading/listening papers must have exactly 38 (CELPIP)
or 39 (TCF) questions. The build checks counts, answers, word ranges and timings, and fails on
mistakes. Content must be original: don't copy official or paid prep material.

### Technical notes

- Next.js App Router with Cache Components. Routes that read `params` export
  `instant = false`.
- Database reads call `await io()` first, so history is read per request instead of being baked
  into the prerendered page (better-sqlite3 is synchronous).
- `/` redirects to `/en` in `next.config.ts`.
- `src/proxy.ts` adds the optional `APP_PASSWORD` gate.
