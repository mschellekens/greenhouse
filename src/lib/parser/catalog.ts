import type { Category, HabitType, PlantKind } from "../types";

/** Known habit archetypes. `~` prefix marks a weak keyword (half weight). */
export interface Archetype {
  id: string;
  match: RegExp;
  name: string;
  type: HabitType;
  category: Category;
  plant: PlantKind;
  unit?: string;
  keywords: string[];
  /** Follow-up options when the user gave no measurable goal. */
  options?: { label: string; target: number; period: "day" | "week" | "month"; type?: HabitType; unit?: string }[];
  question?: string;
}

export const ARCHETYPES: Archetype[] = [
  {
    id: "lift",
    match: /\b(lift(ing)?|weights?|strength|resistance training)\b/,
    name: "Lift weights",
    type: "frequency",
    category: "Movement",
    plant: "olive",
    keywords: ["lift", "lifted", "lifting", "weights", "strength", "squat", "deadlift", "bench", "~gym", "~workout", "~trained"],
    question: "How often would you like to lift?",
    options: [
      { label: "2× a week", target: 2, period: "week" },
      { label: "3× a week", target: 3, period: "week" },
      { label: "4× a week", target: 4, period: "week" },
    ],
  },
  {
    id: "cardio",
    match: /\b(cardio|run(ning)?|jog(ging)?|cycl(e|ing)|bike|biking|swim(ming)?|rowing|spin)\b/,
    name: "Cardio",
    type: "frequency",
    category: "Movement",
    plant: "fern",
    unit: "min",
    keywords: ["cardio", "run", "ran", "running", "jog", "jogged", "bike", "biked", "cycling", "cycled", "swim", "swam", "rowing", "spin", "elliptical", "~gym", "~workout"],
    question: "How often would you like to do cardio?",
    options: [
      { label: "2× a week", target: 2, period: "week" },
      { label: "3× a week", target: 3, period: "week" },
      { label: "150 min a week", target: 150, period: "week", type: "quantity", unit: "min" },
    ],
  },
  {
    id: "read",
    match: /\b(read(ing)?|books?)\b/,
    name: "Read",
    type: "quantity",
    category: "Mind",
    plant: "lavender",
    unit: "min",
    keywords: ["read", "reading", "book", "pages", "chapter"],
    question: "What does reading more look like for you?",
    options: [
      { label: "20 min a day", target: 20, period: "day", type: "quantity", unit: "min" },
      { label: "2 hours a week", target: 120, period: "week", type: "quantity", unit: "min" },
      { label: "4 sessions a week", target: 4, period: "week", type: "frequency" },
    ],
  },
  {
    id: "alcohol",
    match: /\b(alcohol|drink(ing)?|booze|wine|beer|drinks)\b/,
    name: "Alcohol",
    type: "limit",
    category: "Nourishment",
    plant: "succulent",
    unit: "drinks",
    keywords: ["alcohol", "drink", "drinks", "drank", "wine", "beer", "beers", "glass", "glasses", "cocktail", "cocktails", "pint", "pints", "whisky", "vodka", "gin"],
    question: "What limit feels right for alcohol?",
    options: [
      { label: "Up to 3 drinks a week", target: 3, period: "week" },
      { label: "Up to 5 drinks a week", target: 5, period: "week" },
      { label: "Up to 8 drinks a week", target: 8, period: "week" },
      { label: "None at all", target: 0, period: "week" },
    ],
  },
  {
    id: "meditate",
    match: /\b(meditat(e|ion|ing)|mindful(ness)?|breathwork)\b/,
    name: "Meditate",
    type: "frequency",
    category: "Mind",
    plant: "lavender",
    unit: "min",
    keywords: ["meditate", "meditated", "meditation", "mindfulness", "breathwork", "breathing"],
    question: "How often would you like to meditate?",
    options: [
      { label: "Every day", target: 1, period: "day" },
      { label: "5× a week", target: 5, period: "week" },
      { label: "10 min a day", target: 10, period: "day", type: "quantity", unit: "min" },
    ],
  },
  {
    id: "family",
    match: /\b(call|calls|phone|family|mother|mom|mum|dad|father|parents|friends?)\b/,
    name: "Call family",
    type: "frequency",
    category: "Connection",
    plant: "monstera",
    keywords: ["call", "called", "calling", "phoned", "mother", "mom", "mum", "dad", "father", "parents", "family", "sister", "brother", "grandma"],
    question: "How often would you like to call?",
    options: [
      { label: "Once a week", target: 1, period: "week" },
      { label: "Twice a week", target: 2, period: "week" },
      { label: "Every other week", target: 2, period: "month" },
    ],
  },
  {
    id: "sleep",
    match: /\b(sleep|bed ?time|rest)\b/,
    name: "Sleep",
    type: "quantity",
    category: "Rest",
    plant: "snake",
    unit: "h",
    keywords: ["sleep", "slept", "bed", "asleep"],
    question: "What sleep goal would help?",
    options: [
      { label: "7 h average", target: 7, period: "day", type: "quantity", unit: "h" },
      { label: "8 h average", target: 8, period: "day", type: "quantity", unit: "h" },
    ],
  },
  {
    id: "walk",
    match: /\b(walk(ing)?|steps|hike|hiking)\b/,
    name: "Walk",
    type: "frequency",
    category: "Movement",
    plant: "fern",
    unit: "min",
    keywords: ["walk", "walked", "walking", "hike", "hiked", "steps"],
    question: "How often would you like to walk?",
    options: [
      { label: "Every day", target: 1, period: "day" },
      { label: "4× a week", target: 4, period: "week" },
    ],
  },
  {
    id: "yoga",
    match: /\b(yoga|stretch(ing)?|mobility|pilates)\b/,
    name: "Yoga",
    type: "frequency",
    category: "Movement",
    plant: "lavender",
    keywords: ["yoga", "stretch", "stretched", "stretching", "mobility", "pilates"],
    question: "How often would you like to practice?",
    options: [
      { label: "2× a week", target: 2, period: "week" },
      { label: "3× a week", target: 3, period: "week" },
    ],
  },
  {
    id: "journal",
    match: /\b(journal(ing)?|write|writing|diary)\b/,
    name: "Journal",
    type: "frequency",
    category: "Mind",
    plant: "fern",
    keywords: ["journal", "journaled", "journaling", "wrote", "diary"],
    question: "How often would you like to journal?",
    options: [
      { label: "Every day", target: 1, period: "day" },
      { label: "3× a week", target: 3, period: "week" },
    ],
  },
];
