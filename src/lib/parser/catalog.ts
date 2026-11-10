import type { Category, Direction, HabitType, PlantKind } from "../types";

export interface ArchetypeOption {
  label: string;
  target: number;
  windowDays: number;
  type?: HabitType;
  unit?: string;
  quantityMode?: "total" | "average";
}

/** Known habit archetypes. `~` prefix marks a weak keyword (half weight). */
export interface Archetype {
  id: string;
  match: RegExp;
  name: string;
  emoji: string;
  type: HabitType;
  direction: Direction;
  category: Category;
  plant: PlantKind;
  unit?: string;
  keywords: string[];
  /** short follow-up phrase used to compose one conversational question */
  ask: string;
  options: ArchetypeOption[];
}

export const ARCHETYPES: Archetype[] = [
  {
    id: "strength",
    match: /\b(lift(ing)?|weights?|strength|resistance training|gym)\b/,
    name: "Strength training",
    emoji: "🏋️",
    type: "frequency",
    direction: "more",
    category: "Movement",
    plant: "olive",
    keywords: ["lift", "lifted", "lifting", "weights", "strength", "squat", "squats", "deadlift", "bench", "~gym", "~workout", "~trained"],
    ask: "how often would you like to train strength",
    options: [
      { label: "2 times a week", target: 2, windowDays: 7 },
      { label: "3 times a week", target: 3, windowDays: 7 },
      { label: "4 times a week", target: 4, windowDays: 7 },
    ],
  },
  {
    id: "cardio",
    match: /\b(cardio|run(ning)?|jog(ging)?|cycl(e|ing)|bike|biking|swim(ming)?|rowing|spin)\b/,
    name: "Cardio",
    emoji: "🏃",
    type: "frequency",
    direction: "more",
    category: "Movement",
    plant: "fern",
    unit: "min",
    keywords: ["cardio", "run", "ran", "running", "jog", "jogged", "bike", "biked", "cycling", "cycled", "swim", "swam", "rowing", "spin", "elliptical", "~gym", "~workout"],
    ask: "how often would you like to do cardio",
    options: [
      { label: "2 times a week", target: 2, windowDays: 7 },
      { label: "3 times a week", target: 3, windowDays: 7 },
      { label: "150 minutes a week", target: 150, windowDays: 7, type: "quantity", unit: "min" },
    ],
  },
  {
    id: "reading",
    match: /\b(read(ing)?|books?)\b/,
    name: "Reading",
    emoji: "📖",
    type: "frequency",
    direction: "more",
    category: "Mind",
    plant: "ficus",
    unit: "min",
    keywords: ["read", "reading", "book", "pages", "chapter"],
    ask: "how often would you like to read",
    options: [
      { label: "4 days a week", target: 4, windowDays: 7 },
      { label: "Every day", target: 1, windowDays: 1 },
      { label: "2 hours a week", target: 120, windowDays: 7, type: "quantity", unit: "min" },
    ],
  },
  {
    id: "alcohol",
    match: /\b(alcohol|drink(ing)?|booze|wine|beer|drinks)\b/,
    name: "Alcohol",
    emoji: "🍷",
    type: "limit",
    direction: "less",
    category: "Health",
    plant: "rosemary",
    unit: "drinks",
    keywords: ["alcohol", "drink", "drinks", "drank", "wine", "beer", "beers", "glass", "glasses", "cocktail", "cocktails", "pint", "pints", "whisky", "vodka", "gin"],
    ask: "what limit would feel right for alcohol",
    options: [
      { label: "Up to 2 drinks a week", target: 2, windowDays: 7 },
      { label: "Up to 4 drinks a week", target: 4, windowDays: 7 },
      { label: "Up to 7 drinks a week", target: 7, windowDays: 7 },
      { label: "None at all", target: 0, windowDays: 7 },
    ],
  },
  {
    id: "meditation",
    match: /\b(meditat(e|ion|ing)|mindful(ness)?|breathwork)\b/,
    name: "Meditation",
    emoji: "🧘",
    type: "frequency",
    direction: "more",
    category: "Mind",
    plant: "lavender",
    unit: "min",
    keywords: ["meditate", "meditated", "meditation", "mindfulness", "breathwork"],
    ask: "how often would you like to meditate",
    options: [
      { label: "4 times a week", target: 4, windowDays: 7 },
      { label: "Every day", target: 1, windowDays: 1 },
      { label: "10 minutes a day", target: 10, windowDays: 1, type: "quantity", unit: "min" },
    ],
  },
  {
    id: "family",
    match: /\b(call|calls|calling|phone|family|mother|mom|mum|dad|father|parents)\b/,
    name: "Family",
    emoji: "📞",
    type: "frequency",
    direction: "maintain",
    category: "Relationships",
    plant: "ivy",
    keywords: ["call", "called", "calling", "phoned", "mother", "mom", "mum", "dad", "father", "parents", "family", "sister", "brother", "grandma"],
    ask: "how often would you like to call",
    options: [
      { label: "Every 14 days", target: 1, windowDays: 14 },
      { label: "Once a week", target: 1, windowDays: 7 },
      { label: "Twice a week", target: 2, windowDays: 7 },
    ],
  },
  {
    id: "sleep",
    match: /\b(sleep|bed ?time)\b/,
    name: "Sleep",
    emoji: "🌙",
    type: "quantity",
    direction: "maintain",
    category: "Recovery",
    plant: "monstera",
    unit: "h",
    keywords: ["sleep", "slept", "asleep"],
    ask: "how much sleep are you aiming for",
    options: [
      { label: "7 hours on average", target: 7, windowDays: 1, type: "quantity", unit: "h", quantityMode: "average" },
      { label: "7.5 hours on average", target: 7.5, windowDays: 1, type: "quantity", unit: "h", quantityMode: "average" },
      { label: "8 hours on average", target: 8, windowDays: 1, type: "quantity", unit: "h", quantityMode: "average" },
    ],
  },
  {
    id: "outside",
    match: /\b(outside|outdoors|walk(ing)?|hike|hiking|nature)\b/,
    name: "Time outside",
    emoji: "🌿",
    type: "frequency",
    direction: "more",
    category: "Lifestyle",
    plant: "fern",
    keywords: ["outside", "outdoors", "walk", "walked", "walking", "hike", "hiked", "park"],
    ask: "how often would you like to get outside",
    options: [
      { label: "Every day", target: 1, windowDays: 1 },
      { label: "4 times a week", target: 4, windowDays: 7 },
    ],
  },
  {
    id: "journal",
    match: /\b(journal(ing)?|diary)\b/,
    name: "Journaling",
    emoji: "✍️",
    type: "frequency",
    direction: "more",
    category: "Mind",
    plant: "lavender",
    keywords: ["journal", "journaled", "journaling", "diary"],
    ask: "how often would you like to journal",
    options: [
      { label: "Every day", target: 1, windowDays: 1 },
      { label: "3 times a week", target: 3, windowDays: 7 },
    ],
  },
  {
    id: "takeaway",
    match: /\b(takeaway|takeout|take-out|delivery|fast food)\b/,
    name: "Takeaway meals",
    emoji: "🥡",
    type: "limit",
    direction: "less",
    category: "Health",
    plant: "rosemary",
    unit: "meals",
    keywords: ["takeaway", "takeout", "delivery", "ordered"],
    ask: "what limit would feel right for takeaway",
    options: [
      { label: "At most 1 a week", target: 1, windowDays: 7 },
      { label: "At most 2 a week", target: 2, windowDays: 7 },
    ],
  },
];

/** Suggestions offered on onboarding screen 3 for manual creation. */
export const SUGGESTIONS = ["strength", "cardio", "reading", "meditation", "family", "sleep", "outside", "alcohol"];
