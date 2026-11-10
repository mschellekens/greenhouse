/** The three Home views. Plants is the default for new users; the last choice is remembered per browser. */
export type HomeView = "plants" | "map" | "garden";
export const HOME_VIEWS: { id: HomeView; label: string; caption: string }[] = [
  { id: "plants", label: "Plants", caption: "Each habit right now: how you’re doing against your target in the current window." },
  { id: "map", label: "Map", caption: "Where you’re trending and what could use your attention first." },
  { id: "garden", label: "Greenhouse", caption: "Over time: every week you reach a goal adds a plant that keeps growing." },
];
export const VIEW_KEY = "greenhouse:home-view";

export function parseView(v: unknown): HomeView | null {
  return v === "plants" || v === "map" || v === "garden" ? v : null;
}

/** Last view chosen in this browser, else the saved default, else Plants. */
export function resolveView(stored: string | null | undefined, settingsDefault?: string): HomeView {
  return parseView(stored) ?? parseView(settingsDefault) ?? "plants";
}

export function loadView(settingsDefault?: string): HomeView {
  if (typeof window === "undefined") return resolveView(null, settingsDefault);
  try {
    return resolveView(window.localStorage.getItem(VIEW_KEY), settingsDefault);
  } catch {
    return resolveView(null, settingsDefault);
  }
}
export function saveView(v: HomeView) {
  try {
    window.localStorage.setItem(VIEW_KEY, v);
  } catch {
    /* private mode */
  }
}
export const viewPath = (v: HomeView) => `/${v}`;
