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
npm test               # Vitest: scoring engine, attention, demo journey, parsers
npm run build
node scripts/screenshots.mjs http://localhost:3100   # mobile screenshots -> screenshots/ (needs Chrome at /usr/bin/google-chrome)
```

On first open you get onboarding (spec §3, six screens: welcome, how many, describe in your own words, confirm, Map or Garden, integrations). **Explore an example greenhouse** on the welcome screen seeds the spec §13 journey (Strength 3/wk, Cardio 2/wk, Alcohol max 2/wk with complete logging, Reading 4 days/wk, Family call every 14 days; six weeks of history). `/plants` shows every plant at every condition. Add more habits later via Settings → Add habits (`/welcome?step=3`).

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
| Attention ranking, band labels, next-action copy | `src/lib/attention.ts` |
| Example greenhouse (spec §13 journey) | `src/lib/demo.ts`, tests in `demo.test.ts` |
| SVG plants (olive, fern, ficus, monstera, lavender, ivy, rosemary) | `src/components/Plant.tsx` (all states at `/plants`) |
| Screens | `src/app/welcome` (onboarding 1-6), `src/app/(main)/{map,garden,habit/[id],history,settings}` |

### Brand
Palette from the spec: ivory `#F7F6F0`, forest `#23382F`, sage `#829985`, leaf `#5E9070`, ochre `#D9AF69`, terracotta `#C97862`, stone `#ECEDE5`, gray `#788077` (Tailwind tokens in `tailwind.config.ts`). Small text uses slightly darker "ink" variants of gray/sage/ochre/terracotta so it meets WCAG AA contrast on ivory. Type: Instrument Serif (display) + Inter.

### Scoring in one paragraph
Every goal is a target over a **rolling window** (`windowDays`: 1, 7, 14, 30), with a direction (do more / maintain / do less). An event counts fully for the first half of the window, then fades linearly to zero at 1.5x the window, so conditions decline gradually as time passes and never fall off a cliff at a boundary. **Frequency** goals count distinct active days (or events) against the target, with a small spacing adjustment and overshoot capped (more than the target is not rewarded). **Quantity** goals use totals or averages (sleep). **Limit** (do less) goals compare exposure with the allowance: within the limit scores 80-100, over it falls smoothly; unlogged days are *never* treated as success, so unless the user marks "I log every one" the condition reads "Based on your logs" and drops to *Insufficient data* when logging is sparse. Paused days are skipped and a paused habit holds its condition. Goals are versioned by effective date; events keep their local calendar day. Bands: Thriving ≥80 (leaf), Doing well ≥60 (sage), Worth attention ≥40 (ochre), Needs attention <40 (terracotta), Insufficient data (gray), Paused. The number is internal; the UI leads with the label and a plain-language sentence.

### Attention
`rankByAttention` orders the Map by: condition, proximity to the next band down, how actionable one more event would be, importance, trajectory, and damping for long-neglected habits so one habit doesn't dominate forever.

## Going live: what is needed

1. **Supabase** (accounts + sync)
   - Create a project; run `supabase/schema.sql` (tables: profiles, habits, habit_goals, habit_pauses, events; RLS on every table, owner-only policies).
   - Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - `npm i @supabase/supabase-js`, implement `SupabaseAdapter` (`load`/`save`) and add sign-in (magic link or Google). Swap the adapter in `src/lib/store.tsx`. A one-time import of the local data on first sign-in is recommended.
2. **LLM key** (better language understanding)
   - Set `OPENAI_API_KEY` (optional `OPENAI_MODEL`, default `gpt-4o-mini`) or `ANTHROPIC_API_KEY` (optional `ANTHROPIC_MODEL`) on the server. The app detects it via `GET /api/parse` and uses the LLM parser. Every LLM result is checked against real habits, future dates and numbers present in the text; anything ungrounded falls back to the rule parser.
3. **Vercel deploy**
   - Import the repo in Vercel (framework: Next.js, no extra config), add the env vars above, deploy. The PWA manifest and icons are in `public/`.

Integrations (Apple Health, Google Health Connect, Strava, Oura) appear in onboarding step 6 and Settings as *Not available yet*. None are implemented; the schema has `integration_connections` and `events.source_event_id` (deduped) ready.

## Known limitations of this build
- Data is per browser until Supabase is connected. Use Settings → Export to back up.
- Custom Map order uses move buttons rather than drag and drop.
- Reminders are off and not implemented.
- No service worker yet, so the PWA installs but does not work offline.
- The rule parser covers common phrasings (numbers as words, minutes/hours, drinks, today/yesterday/last night/this morning/weekday names/"N days ago"). Anything else gets a follow-up question instead of a guess.
