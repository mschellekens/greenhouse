GREENHOUSE

Full product and application build brief

1. Product vision

Build Greenhouse, a beautifully designed, AI-native habit application that helps people see which parts of their lives need attention.

Core philosophy: Life isn’t a checklist. It’s something you cultivate.

Traditional habit trackers focus on daily checkboxes, consecutive streaks, and rigid completion targets. Greenhouse takes a different approach.

Users choose which behaviors they want to cultivate, improve, maintain, or reduce. Greenhouse understands their desired frequency, monitors their activity, and continuously visualizes how well they’re maintaining each behavior.

Rather than asking “Have you completed today’s tasks?”, Greenhouse answers:

“What’s doing well, and what needs a little attention?”

For example:

* Strength training three times a week.
* Cardio twice a week.
* Drinking alcohol no more than twice a week.
* Calling family at least once every two weeks.
* Reading regularly.
* Getting outside more often.
* Meditating four times per week.

The user logs events whenever they happen. Some events can be captured automatically through integrations.

Each behavior gradually changes its visual state according to how recently and consistently the user has engaged in it.

There are no streaks to lose, no arbitrary midnight resets, and no need to complete an entire list every day.

The application’s visual language has two modes:

1. Heat Map: An elegant, minimal overview of habits using continuously changing colors.
2. Garden: A botanical visualization where each habit is represented by a living plant whose condition reflects the health of that behavior.

Both modes use the exact same underlying behavioral data and scoring engine.

The experience should feel closer to Oura, Apple Health, and a beautifully designed botanical journal than to a conventional productivity tool.

⸻

2. Brand identity

Brand name: Greenhouse

Brand philosophy: Attention over perfection.

Primary tagline: Grow what matters.

Supporting message: A little attention goes a long way.

Brand personality:

* Calm and intelligent
* Warm but not sentimental
* Premium and editorial
* Nature-inspired without being whimsical
* Minimal without feeling clinical
* Encouraging without motivational clichés

Avoid gamification tropes, achievement badges, points, leaderboards, cartoon plants, and overly enthusiastic copy.

Greenhouse should feel like a place people enjoy visiting, rather than an application demanding their attention.

Visual identity

Use a sophisticated botanical aesthetic.

Color palette:

Purpose	Color	Hex
Primary background	Warm ivory	#F7F6F0
Main text	Deep forest	#23382F
Primary accent	Sage	#829985
Healthy state	Leaf green	#5E9070
Developing concern	Muted ochre	#D9AF69
Needs attention	Soft terracotta	#C97862
Surfaces	Pale stone	#ECEDE5
Secondary text	Warm gray	#788077

These are starting values, not constraints against refining the visual system. Maintain accessible contrast throughout.

Typography:

* Use a sophisticated editorial serif for headlines, such as Instrument Serif.
* Use a clean modern sans serif for navigation, descriptions, numbers, and controls, such as Inter.
* Generous whitespace.
* Restrained typography hierarchy.
* No excessive bold text or decorative elements.

Logo direction:

Create an understated Greenhouse wordmark. Explore a simple botanical symbol, perhaps a stem, emerging leaf, or abstract glasshouse silhouette. Avoid generic leaf icons or overly literal greenhouse illustrations.

The app icon should be identifiable at small sizes, with a simple forest-green mark on an ivory background.

Motion:

Use subtle, purposeful animations. Changes in habit condition should feel gradual and organic. Plants can gently sway or recover, but there should be no confetti, excessive bouncing, or reward animations.

Transitions should reinforce the sense of a living environment.

⸻

3. First-time experience and onboarding

Onboarding should be conversational, AI-assisted, and extremely lightweight.

Do not present the user with a long form.

Screen 1: Welcome

Display the Greenhouse wordmark, accompanied by an elegant botanical illustration.

Headline:

Grow what matters.

Supporting copy:

“Keep the important things in good shape. Greenhouse helps you see what’s thriving and what could use your attention.”

Primary CTA:

Create your greenhouse

Screen 2: Choose how many habits

Ask:

“What would you like to keep an eye on?”

Let the user select how many habits they initially want to track. Offer convenient suggestions such as 3, 5, or 8, but allow any reasonable number and let users add or remove habits later.

This is not a commitment to maintaining that number forever.

Screen 3: Conversational habit creation

Show a large, beautiful prompt field with suggestions.

Placeholder:

“Tell us what you’d like to grow…”

Example input:

“I want to lift weights three times a week, do cardio twice, read more, and drink less alcohol.”

Greenhouse should use an LLM to interpret this as distinct trackable habits.

Generate an editable proposal:

Strength training
3 times per week

Cardio
2 times per week

Reading
Needs a frequency

Alcohol
Needs a limit

Ask only the necessary follow-up questions, preferably conversationally:

“How often would you like to read, and what limit would feel right for alcohol?”

Users should also be able to create habits manually by selecting from suggestions or entering a custom name.

Provide attractive optional category suggestions, such as Movement, Health, Mind, Relationships, Recovery, and Lifestyle.

Do not force categories.

Screen 4: Confirm the habits

Each habit should have:

* Custom name
* Optional emoji or botanical icon
* Goal type: do more, maintain, or do less
* Target frequency or limit
* Measurement unit, where relevant
* Optional preferred days
* Optional plant choice

Examples:

“Exercise at least 3 times in 7 days.”

“Drink no more than 2 alcoholic drinks per week.”

“Call my parents at least once every 14 days.”

“Get at least 7 hours of sleep on 5 nights each week.”

The AI should translate natural language into clear, editable tracking rules.

Use rolling time windows rather than rigid calendar weeks by default. Respect explicit calendar-based preferences if the user requests them.

Screen 5: Choose a visualization

Show two beautiful previews.

The Map

A structured overview of habits represented by colored tiles, highlighting what needs attention.

The Garden

An organic collection of illustrated plants representing the user’s habits.

Users can choose either as their default, but can switch between them instantly.

The Garden is a visualization preference, not a separate tracking system.

Screen 6: Connect optional data sources

Offer connections such as:

* Apple Health
* Google Health Connect where supported
* Relevant workout or activity integrations
* Other sources supported by the platform

Clearly explain which habits each integration could help track.

All integrations should be opt-in. Request only necessary permissions.

The user can skip this screen entirely and start manually.

Never imply data is connected when an integration has not been implemented or authorized.

Finish onboarding by taking the user directly into their greenhouse.

⸻

4. Main interface: The Map

This is the default functional foundation of the product.

Create an exceptionally clean, single-screen dashboard.

At the top:

Good morning.

“Here’s what could use your attention.”

Below, display the user’s habits as a responsive grid of elegant tiles.

Each tile displays:

* Habit name
* Current condition through background tint or an elegant indicator
* A subtle status label
* A concise factual summary, for example “2 sessions in the past 7 days”
* A one-tap way to log an activity

Color conveys how healthy the current behavior is relative to the user’s intention.

Green: In a good place.

Sage: Generally healthy, with some room for improvement.

Amber: Attention may be needed soon.

Terracotta: This behavior needs attention.

Neutral gray: Not enough information to determine its state.

Colors should transition continuously as underlying scores change.

The highest-priority habits should be visually obvious, without overwhelming the entire interface.

Users should be able to choose between:

* Attention order
* Custom order
* Category grouping

Example dashboard

Your greenhouse

Habit	Current condition	Explanation
Strength	Green	3 sessions in 7 days
Cardio	Amber	1 of 2 recent sessions
Reading	Green	Read yesterday
Alcohol	Terracotta	Above your chosen limit
Family	Amber	Last call 12 days ago
Meditation	Green	4 sessions in 7 days

This example is illustrative. Actual states must be calculated from the user’s goals and events.

Underneath the overview, show one understated insight:

“Cardio and family time could use a little attention.”

No enormous motivational banners. No artificial urgency.

⸻

5. Alternative interface: The Garden

Build a second visualization that uses the same behavioral engine.

The Garden represents each habit as an illustrated plant.

Each plant is labeled with the habit name and subtly reflects its condition.

Healthy habit: Vibrant, upright, flourishing foliage.

Beginning to need attention: Slightly less vibrant, with subtle changes in posture.

Needs attention: Sparse leaves, drooping stems, or a wilted appearance.

New or unknown: A young, neutral plant that has not yet established a condition.

Plants should not die permanently. Every behavior can recover.

A recently logged event can visibly improve a plant’s state. Sustained consistency can gradually make it fuller and more established.

Do not grow plants endlessly or make larger plants a competitive reward. Plant health should primarily communicate the user’s current condition, not lifetime activity volume.

Botanical illustration style

Use refined 2D botanical illustrations inspired by traditional field guides, contemporary editorial illustration, and minimalist botanical artwork.

Avoid cartoon faces, googly eyes, pixel art, or exaggerated game-like effects.

Allow users to associate habits with different plants, such as:

* Olive tree
* Fern
* Ficus
* Monstera
* Lavender
* Ivy
* Rosemary

Provide a small default selection and allow users to change their plant without affecting their tracking history.

Each plant should have distinct visual states. These must be functional states driven by data, not static decorations.

Garden interactions

Tapping a plant should open a beautiful detail panel with:

* Habit name
* Current condition
* Recent activity
* Goal
* Next suggested action
* Quick log control

For example, tapping a slightly wilted fern representing cardio might reveal:

Cardio

“A little attention would help.”

“1 session in the past 7 days. Your target is 2.”

CTA: Log cardio

After logging an eligible session, the plant should smoothly transition to its updated condition.

Never suggest that a single event fully restores a habit unless the scoring model actually supports that change.

⸻

6. Logging: The most important interaction

Logging must be almost frictionless.

Support three complementary input methods.

A. One-tap logging

Every habit tile and plant detail view has a quick action.

For a binary activity such as meditation, tapping Log immediately records one event at the current timestamp.

Provide a subtle confirmation and an Undo action.

For habits involving quantities, allow quick presets.

Example for alcohol:

* 1 drink
* 2 drinks
* Custom amount

For strength training:

* Log workout
* Optionally provide duration or details

Do not ask for unnecessary information.

B. Natural-language logging

Provide a persistent, accessible input field or bottom action:

Tell Greenhouse what you did

Users can type or dictate:

“Just did 45 minutes of cardio.”

“Had two glasses of wine last night.”

“Called my mother yesterday.”

“Went to the gym on Monday and Wednesday.”

“Read for 30 minutes this morning.”

An LLM identifies:

* The relevant habit
* Event quantity
* Unit
* Timestamp
* Optional contextual information

If confident, prepare the corresponding event or events for quick confirmation.

If ambiguous, ask one concise question.

Examples:

“Did you mean your cardio habit?”

“Was that one or two drinks?”

Do not silently invent events, quantities, or dates.

Support edits, backdated entries, and undo.

C. Passive activity capture

Where integrations exist, Greenhouse should automatically recognize relevant activities.

Examples:

* Recorded workouts
* Steps or exercise minutes
* Sleep sessions
* Meditation sessions

Automatically generated entries should carry source metadata.

Show where an event came from, and allow users to correct it.

Prevent duplicates when the user manually logs something already imported.

Never infer that a user did not perform an activity simply because no connected source recorded it.

⸻

7. The habit condition engine

This is the application’s core intellectual property.

Build a deterministic, explainable calculation engine that evaluates each habit’s current condition based on:

1. User-defined goal
2. Desired frequency or limit
3. Recency of recorded events
4. Distribution of events over time
5. Historical consistency
6. Data completeness and confidence

The engine should maintain a continuously updated condition score between 0 and 100, but this number should not normally be the headline UI.

The user primarily sees the color, plant state, and actionable explanation.

Do not build a simplistic daily checklist engine disguised as a heat map.

Habit types

Type A: Frequency or maintenance habits

Examples:

* Strength training 3 times per 7 days
* Cardio twice per 7 days
* Reading 4 days per week
* Calling family every 14 days

Measure recent completion relative to the target.

Use rolling windows.

A habit with a target of three weekly sessions should consider whether the user has completed three qualifying sessions during the preceding seven days.

Also consider spacing and recency.

For example, doing three workouts on one day should not automatically be treated as equivalent to three properly distributed training sessions if the user intended three different days.

The system should support explicit spacing requirements or infer sensible defaults for the habit type, subject to user confirmation.

As events age out of the rolling window, their contribution should naturally decline.

Habit condition should change smoothly over time, rather than abruptly resetting at midnight on Sunday.

Type B: Reduction or limit habits

Examples:

* Maximum 2 alcoholic drinks per week
* No more than 1 takeaway meal per week
* Limit social media to 30 minutes per day

For these habits, fewer events or lower exposure is better.

When the user logs a behavior exceeding their desired limit, the habit condition worsens.

As those events become older and eventually leave the rolling window, its condition improves.

For example:

If someone logs four drinks within seven days against a two-drink limit, the alcohol habit should show a state requiring attention.

If no further drinking occurs, it should gradually recover as the old events become less relevant.

Important: Missing data is not proof of abstinence. Make the state neutral or qualify it as “Based on your logs” when Greenhouse cannot establish whether logging is complete.

Type C: Duration and quantity habits

Examples:

* 150 minutes of cardio per week
* 7.5 hours of sleep on average
* 8,000 steps per day
* 20 minutes of reading four times a week

Track quantities and units rather than treating everything as a binary occurrence.

Handle averages, cumulative targets, and duration-based thresholds separately.

Scoring design

Implement the scoring logic in a standalone, testable module.

Use normalized target attainment, recency, and temporal consistency for maintenance habits.

For avoidance habits, use recent exposure relative to the chosen limit.

Introduce appropriate smoothing to avoid noisy, arbitrary changes.

The scoring parameters should be configurable and calibrated rather than presented as scientifically validated.

Use understandable condition bands as initial defaults:

* 80–100: Thriving
* 60–79: Doing well
* 40–59: Worth attention
* 0–39: Needs attention
* Unknown: Insufficient data

Do not automatically treat 80 as thriving for every type of habit. Ensure the scoring semantics are consistent across goal types.

Use accessible labels alongside colors.

Provide a concise explanation for each habit’s condition, grounded in the actual events and goal.

The essential principle: Greenhouse tracks the condition of a habit, not whether the user was good or bad today.

⸻

8. Attention intelligence

Above the scoring system, add a lightweight recommendation layer.

It should identify which behaviors are most deserving of attention.

For example:

“Your cardio habit is falling behind its usual rhythm.”

“Reading is in a good place.”

“You’ve been keeping alcohol within your limit.”

“Your family habit may benefit from some attention this week.”

Rank habits according to:

* Current condition
* How close they are to a meaningful threshold
* Whether action is actually possible
* User-set importance
* Recent trajectory

Avoid overemphasizing problems just because they have been neglected for a very long time.

Users must be able to pause habits without penalty.

If the user cannot exercise because they are injured or traveling, a paused habit should not continue generating alerts.

The system should support reminders, but initially keep them off by default or extremely restrained.

A future version could surface a daily or weekly digest of the two or three most relevant things to work on.

⸻

9. Habit detail screen

When opening an individual habit, display:

Header

* Habit name
* Botanical illustration or small indicator
* Current condition
* Short explanation

Activity

* Recent events on a clean timeline
* Quantity and timestamp
* Source: manual, natural language, or integration

Behavioral history

* A small 30-day or 90-day condition chart
* A compact visualization showing changes over time

Goal

* Current target and tracking rules
* Ability to edit the goal using natural language

Actions

* Log activity
* Edit habit
* Pause habit
* Change plant
* Archive habit

Use historical changes to communicate trends, but do not introduce streak counters or completion percentages as the primary motivational system.

⸻

10. Navigation and information architecture

Keep navigation minimal.

The primary navigation should contain:

Home

The main dashboard, with a clearly visible toggle between Map and Garden.

History

A calm overview of logged events and changes in habit condition.

Settings

Habit management, integrations, data controls, and account preferences.

Logging should be accessible globally through a subtle floating action or persistent input affordance.

Do not create many extra tabs, social features, or complex analytics screens.

The app must work beautifully on mobile first, then scale elegantly to desktop.

Use touch-friendly interactions and accessible controls.

⸻

11. Technical implementation

Build a real, functional MVP, not a series of static prototypes.

Preferred stack, unless the existing project provides a better foundation:

* Next.js with React and TypeScript
* Tailwind CSS for styling
* A lightweight, accessible component system
* Supabase for authentication, database, and row-level security
* A model-backed natural-language parser for onboarding and logging
* A deterministic TypeScript scoring engine
* Responsive web app, installable as a PWA where practical

Use a clean component architecture.

Suggested core data structures:

User

* ID
* Preferences
* Default visualization
* Timezone

Habit

* ID
* User ID
* Name
* Category
* Goal type
* Target frequency
* Target quantity
* Unit
* Rolling window
* Optional spacing rule
* Preferred activity days
* Plant type
* Status
* Created at

HabitEvent

* ID
* Habit ID
* Timestamp
* Quantity
* Unit
* Source
* Source event ID
* Notes
* Created at

HabitCondition

* Habit ID
* Score
* State
* Confidence
* Last calculated
* Explanation

IntegrationConnection

* User ID
* Provider
* Permission status
* Last sync
* Synced activity types

Events should be the source of truth. Condition scores are derived and must be recalculable.

Store timestamps in UTC and correctly handle the user’s timezone.

Support editing and deleting entries without corrupting historical condition calculations.

Ensure that every component is connected to real application state and that data persists across sessions.

Do not create fake integrations or simulated automatic tracking while claiming they are connected.

If health integrations are not available within the implementation environment, provide functional manual logging and clearly identify integrations as future capabilities.

Use appropriate privacy controls and secure handling of personal and health-related data.

⸻

12. Important UX edge cases

Design and implement the following cases:

New habit: No activity history yet. Show a neutral young plant rather than a dying one.

Missed activity: Its condition gradually declines in line with the user’s goal.

Return after inactivity: The habit can recover normally. No punishment for broken streaks.

Several activities on one day: Count them accurately according to the goal’s meaning.

Backdated logging: Recalculate the current state and affected historical states.

Changed goal: Apply the new target correctly, and retain the original events.

Vacation or injury: Support pause and resume.

Insufficient data: Show uncertainty rather than making definitive judgments.

Deleted or archived habit: Preserve or remove history according to the user’s explicit action.

Unusually frequent activity: Avoid rewarding potentially inappropriate excess. A target is not an invitation to maximize activity indefinitely.

Avoidance habits: Do not treat an unlogged day as a confirmed success unless the user or a reliable data source establishes it.

⸻

13. Example user journey

Imagine a user who creates the following greenhouse:

1. Strength training: 3 times weekly
2. Cardio: 2 times weekly
3. Alcohol: maximum 2 drinks weekly
4. Reading: 4 days weekly
5. Family: call at least once every 14 days

The user starts with the Map.

Strength training is green because they completed three sessions in the last seven days.

Cardio is amber because they’ve only done one of the two intended sessions.

Alcohol is green because recorded consumption is within the selected limit and the user has indicated that the logging is complete.

Reading is green because they’ve been reading consistently.

Family is approaching amber because the last call was nearly two weeks ago.

The user switches to Garden.

They see five different plants:

* Strength is full and healthy.
* Cardio is slightly drooping.
* Alcohol is healthy.
* Reading is vibrant.
* Family looks like it could use some care.

They tap the cardio plant.

“One session this week. Another would bring you back into your preferred rhythm.”

They then complete a cardio workout and log it with one tap.

The plant becomes healthier, and the Map updates immediately.

The user doesn’t receive a reward badge or congratulations screen.

The feedback is the garden itself getting healthier.

That’s the experience.

⸻

14. MVP priorities and exclusions

Build in this order:

Priority 1: Fully working product

* Premium branded onboarding
* Habit creation and editing
* Natural-language habit definition
* Persistent habit and event storage
* One-tap manual logging
* Reliable scoring engine
* Functional Map
* Habit details

Priority 2: Differentiated experience

* Fully functional Garden visualization
* Plant health animations
* Natural-language event logging
* Condition history
* Attention recommendations

Priority 3: Extensions

* Supported passive integrations
* Smart reminders
* Advanced personalization
* More botanical illustrations
* Home-screen widgets

Do not spend early effort on:

* Social feeds
* Friend competitions
* Streaks
* Badges
* Points or XP
* Coaching subscriptions
* Complex workout programming
* Nutrition databases
* Generic AI chat features that don’t directly improve tracking

Greenhouse’s competitive advantage is its simplicity and intelligence, not feature quantity.

⸻

15. Acceptance criteria

The app is ready for an initial user test when all of the following work:

1. A new user can create a greenhouse through a natural-language conversation.
2. The user can choose the number and type of habits without a prescribed template.
3. Each habit has an editable target and correct scoring behavior.
4. Logging an event immediately updates the relevant habit’s condition.
5. Conditions change correctly as time passes, without requiring a new log.
6. Both Map and Garden display the same underlying state.
7. Plants visibly react to condition changes.
8. Reduction habits behave correctly and are not scored like positive-frequency habits.
9. An event can be edited, deleted, or backdated.
10. Habits can be paused without being penalized.
11. Data persists after refreshing or reopening the application.
12. The product is usable and beautiful on a phone.
13. Unknown or incomplete data is clearly distinguished from good performance.
14. There are no streak counters or mandatory daily checklists.

Include automated tests for the scoring engine, particularly rolling-window boundaries, avoidance habits, event deletion, timezones, and inactivity.

⸻

16. Final design direction

The app should be beautiful enough that someone wants to open it even when they have nothing to log.

Think of a quiet, sophisticated greenhouse: alive, considered, and constantly changing.

The user is not being measured against a perfect version of themselves. They are simply maintaining the things they care about.

The central experience:

Open Greenhouse.

See what’s thriving.

See what needs attention.

Do something about it.

Watch your greenhouse change.

Now build the working application. Start with the complete primary user journey, implement the real data model and scoring logic, and use the visual design system consistently across onboarding, Map, Garden, logging, and details. Prioritize functional depth and design quality over the number of features.