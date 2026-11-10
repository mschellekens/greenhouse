# Greenhouse

Habits that grow like plants. Tell it what you did in plain words; each habit's plant reflects how the last few weeks actually went. No streaks, badges or confetti.

This is the first MVP build. It runs fully on one device (data in the browser) with a deterministic parser. Cloud sync, AI parsing and hosting are wired as interfaces and switch on once accounts and keys exist.

## Run it

```bash
npm install
npm run dev            # http://localhost:3000
# or production
npm run build && npm start -- -p 3100
```

Checks:

```bash
npm run lint
npm run typecheck
npm test               # Vitest: scoring engine + parser
npm run build
node scripts/screenshots.mjs http://localhost:3100   # mobile screenshots -> screenshots/ (needs Chrome at /usr/bin/google-chrome)
```

On first open you get onboarding (6 screens). On the welcome screen, **Load example greenhouse** seeds an eight-week journey (six habits, a past pause, a goal change, partial alcohol logs) so you can see every state. `/plants` shows every plant at every condition.

## How it is built

| Area | Where |
| --- | --- |
| Domain types (events are the source of truth) | `src/lib/types.ts` |
| Scoring engine (pure, deterministic) | `src/lib/scoring.ts`, tests in `src/lib/scoring.test.ts` |
| Rule parser (goals + logs, follow-ups, never invents numbers) | `src/lib/parser/rules.ts`, `catalog.ts`, tests in `rules.test.ts` |
| LLM parser (only when a key is set; validated, falls back to rules) | `src/lib/parser/llm.ts`, `src/app/api/parse/route.ts` |
| Storage adapter interface | `src/lib/storage/adapter.ts` |
| localStorage adapter (active) | `src/lib/storage/local.ts` |
| Supabase adapter (stub, **not connected**) + schema/RLS | `src/lib/storage/supabase.ts`, `supabase/schema.sql` |
| App state + actions (undo, soft delete) | `src/lib/store.tsx` |
| SVG plants (olive, fern, lavender, monstera, snake plant, echeveria) | `src/components/Plant.tsx` |
| Screens | `src/app/welcome` (onboarding 1-6), `src/app/(main)/{map,garden,habit/[id],history,settings}` |

### Scoring in one paragraph
Three habit types. **Frequency** (A): distinct active days in a rolling window (7 days for weekly/daily goals, 30 for monthly) against the goal, blended 70/30 with the previous window so there are no cliffs; a smooth exponential fade once the gap since the last session exceeds ~1.5x the expected rhythm; a small spacing adjustment for bunched sessions; overshoot capped. **Limit** (B): only logged days count, unlogged days are unknown (never zero); score is "based on your logs" with a completeness percentage and a confidence that drops with sparse logging; no logs means *unknown*, not success; avoid-type limits (0) score the share of logged days that were clear. **Quantity** (C): totals (minutes, pages) vs a per-period target, or an average per logged day (sleep). Paused days are skipped entirely and a paused habit holds its last score. Goals are versioned by effective date, so history keeps the goal that applied then. Events carry their local calendar date (fixed at log time in the user's timezone), so timezone changes never move history. Score 0-100 maps to bands: Thriving ≥75, Growing ≥50, Needs care ≥25, Dormant <25, plus Unknown and Resting.

## Going live: what is needed

1. **Supabase** (accounts + sync)
   - Create a project; run `supabase/schema.sql` (tables: profiles, habits, habit_goals, habit_pauses, events; RLS on every table, owner-only policies).
   - Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - `npm i @supabase/supabase-js`, implement `SupabaseAdapter` (`load`/`save`) and add sign-in (magic link or Google). Swap the adapter in `src/lib/store.tsx`. A one-time import of the local data on first sign-in is recommended.
2. **LLM key** (better language understanding)
   - Set `OPENAI_API_KEY` (optional `OPENAI_MODEL`, default `gpt-4o-mini`) or `ANTHROPIC_API_KEY` (optional `ANTHROPIC_MODEL`) on the server. The app detects it via `GET /api/parse` and uses the LLM parser. Every LLM result is checked against real habits, future dates and numbers present in the text; anything ungrounded falls back to the rule parser.
3. **Vercel deploy**
   - Import the repo in Vercel (framework: Next.js, no extra config), add the env vars above, deploy. The PWA manifest and icons are in `public/`.

Integrations (Apple Health, Google Fit, Strava, Oura, Calendar) are shown in Settings as *not connected · coming later*. None are implemented.

## Known limitations of this build
- Data is per browser until Supabase is connected. Use Settings → Export to back up.
- No service worker yet, so the PWA installs but does not work offline.
- The rule parser covers common phrasings (numbers as words, minutes/hours, drinks, today/yesterday/last night/this morning/weekday names/"N days ago"). Anything else gets a follow-up question instead of a guess.
