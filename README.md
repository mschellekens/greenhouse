# Greenhouse

Habits that grow like plants. Tell it what you did in plain words; each habit gets a bench in a walk-in greenhouse, every week you reach its goal adds a plant that keeps growing, and how lush or droopy the plants look follows how the habit is trending. It is about balance over time, not perfect days. No streaks, badges or confetti.

**Live:** https://mschellekens.github.io/greenhouse/ · **Repo:** https://github.com/mschellekens/greenhouse

## Using it

1. **Start.** Open the link on your phone. *Create your greenhouse* plays three short intro screens (balance, rhythm, care), then asks what you want to grow in your own words ("lift weights 3 times a week, read more, drink less"). It proposes habits, asks a follow-up only when a number is missing, and you confirm. *Explore an example greenhouse* loads a year of demo history instead. You can replay the intro any time: Settings → *How Greenhouse works*.
2. **Log.** Tap the button on a tile or bench sheet for one-tap logging (with undo), or type or dictate into *Tell Greenhouse what you did* ("ran 5k yesterday", "2 glasses of wine last night"). You always confirm before anything is saved.
3. **Look.** Home has three views (Plants · Map · Greenhouse); the last one you picked is remembered in this browser, Plants for new users.
   - **Plants** (now): one big plant per habit in a 2-column grid. Its size and lushness or droop follow the current condition. The pot shows how you're doing against target in the current scoring window, uncapped (4 of 3 sessions = 133%, 90 of 150 min = 60%; for limits, the share of the allowance used), with a small up/down cue for the week's trend. Tap for details.
   - **Map** (trending): what could use attention first, with current % of target and trend per habit; also Custom and Category order.
   - **Greenhouse** (over time): the walk-in greenhouse. Every goal-week earned adds a plant; drag, pinch or +/− to look around, tap a bench. The front pot shows long-term goal attainment (capped per week).
   *History* lists every entry (editable), condition changes and new plants.
4. **Tend.** Pause a habit for travel or injury (paused days never count against you), change its goal in plain words, archive it (keeps history) or delete it.

### Install it on your home screen (works offline)

- **iPhone / iPad:** open the link in Safari → Share → *Add to Home Screen*.
- **Android:** Chrome menu (⋮) → *Install app* (or the install prompt in Settings → Install & offline).
- **Desktop Chrome / Edge:** install icon in the address bar.

After the first visit a service worker caches the whole app, so it opens and works with no connection. Your data never leaves the device.

### Reminders

Settings → Reminders. Off by default, at most one per habit per day, per-habit time and days, skipped for paused habits and (optionally) for habits already logged that day. They come from the device with no server: they fire while Greenhouse is open or in the background, and an installed Android app may also get them when closed (Periodic Background Sync, timing decided by the browser). **iPhone needs the Home Screen install first** (iOS 16.4+), and then reminders show while the app is running. True push while fully closed needs a push server (next step below).

### Back up your data

Everything lives in this browser's storage. Settings → *Your data* → **Export backup (JSON)** downloads every habit, goal version, pause and entry. **Import a backup…** (or *Restore from a backup* on the welcome screen of a new device) restores it after validation. *Erase all data* wipes this device. Back up before clearing your browser or switching phones.

### Optional: AI understanding with your own key

The built-in rule parser is always on. Settings → *Understanding your words* lets you add your own OpenAI or Anthropic API key (and optional model). The key is stored only in this browser's localStorage and the browser calls the provider directly. Every AI answer goes through the same validation as the server route (known habits only, no future dates, no numbers that aren't in your text, goal proposals normalised), and any error, timeout or ungrounded answer falls back to the rules. Use a key with a spending limit.

## Run it

```bash
npm install
npm run dev            # http://localhost:3000/greenhouse/
npm test
npm run build          # static export into out/ + generates out/sw.js (precache list)
npx --yes serve out    # local preview of the Pages build
```

The Next config uses `output: 'export'` with `basePath` and `assetPrefix` `/greenhouse` so the same build works on GitHub Pages. There is no `next start` server. The optional LLM route lives in `src/optional-api/` and is not part of this build; the client uses the built-in rule parser only.

Checks:

```bash
npm run lint
npm run typecheck
npm test               # Vitest: scoring engine, attention, demo journey, parsers
npm run build
node scripts/v5-shots.mjs http://localhost:3200/greenhouse   # screenshots + checks: service worker, offline reload, drag reorder, backup export/import, intro
node scripts/icons.mjs # re-render PWA icons (any, maskable, apple-touch) from public/icon.svg
```

## How it is built

| Area | Where |
| --- | --- |
| Domain types (events are the source of truth) | `src/lib/types.ts` |
| Scoring engine (pure, deterministic) | `src/lib/scoring.ts`, tests in `src/lib/scoring.test.ts` |
| Rule parser (goals + logs, follow-ups, never invents numbers) | `src/lib/parser/rules.ts`, `catalog.ts`, tests in `rules.test.ts` |
| LLM parsing: shared prompts/calls `llmCore.ts`, validation `llm.ts`, browser parser with user key `browser.ts` (tests `browser.test.ts`), optional server route `src/optional-api/parse/route.ts` | `src/lib/parser/` |
| Garden: ISO weeks, earned plants, growth stages, attainment, vitality | `src/lib/garden.ts`, tests `garden.test.ts` |
| Greenhouse scene (3D perspective, pan/zoom, readable signs) | `src/components/greenhouse/Interior.tsx`, `PanZoom.tsx`, `PottedPlant.tsx`, tests `signs.test.ts` |
| Habit bench and single plants (detail sheet, habit page, pickers) | `src/components/greenhouse/HabitPlants.tsx` |
| Intro (NUX), replayable | `src/components/Nux.tsx`, `src/app/intro` |
| PWA: service worker template + build step, registration, install, notifications | `scripts/sw-template.js`, `scripts/build-sw.mjs`, `src/lib/pwa.ts`, `src/components/Pwa.tsx` |
| Reminders (pure scheduling) | `src/lib/reminders.ts` |
| Backup export/import validation, reorder helpers | `src/lib/backup.ts`, `src/lib/order.ts`, tests `v5.test.ts` |
| Storage adapter interface | `src/lib/storage/adapter.ts` |
| localStorage adapter (active) | `src/lib/storage/local.ts` |
| Supabase adapter (stub, **not connected**) + schema/RLS | `src/lib/storage/supabase.ts`, `supabase/schema.sql` |
| App state + actions (undo, soft delete) | `src/lib/store.tsx` |
| Attention ranking, band labels, next-action copy | `src/lib/attention.ts` |
| Example greenhouse (spec §13 journey) | `src/lib/demo.ts`, tests in `demo.test.ts` |
| Screens | `src/app/intro`, `src/app/welcome` (onboarding 1-6), `src/app/(main)/{map,garden,habit,history,settings}`; every species and state at `/plant-states` |

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
2. **Push server** (reminders while the app is fully closed): a small Web Push service (VAPID keys) that stores push subscriptions per user, best alongside Supabase.
3. **Node/Vercel host (optional)**: move `src/optional-api/parse/route.ts` to `src/app/api/parse/route.ts`, drop `output: 'export'`/`basePath` if served at the root, set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`. Today the static build supports AI only with a user-supplied key.

Integrations (Apple Health, Google Health Connect, Strava, Oura) appear in onboarding step 6 and Settings as *Not available yet*. None are implemented; the schema has `integration_connections` and `events.source_event_id` (deduped) ready.

## Known limitations of this build
- Data is per browser until Supabase is connected. Export a backup regularly.
- Reminders can't fire while the app is fully closed on iPhone, and only best-effort on Android (no push server yet).
- Integrations are listed honestly as *Not available yet*; nothing is imported.
- Drag-and-drop reordering lives in Settings → Habits (move buttons also on the Map's Custom order).
- The rule parser covers common phrasings (numbers as words, minutes/hours, drinks, today/yesterday/last night/this morning/weekday names/"N days ago"). Anything else gets a follow-up question instead of a guess, unless you add your own AI key.
- Plants keep accumulating (one per goal-week). Each bench shows as many as fit and its sign notes "+N more"; the detail sheet and habit page show the rest as a count.
