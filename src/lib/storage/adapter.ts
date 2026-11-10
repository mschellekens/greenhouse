import type { AppState } from "../types";

/**
 * Persistence boundary. The app keeps the whole AppState in memory and asks
 * the adapter to persist it. Events are the source of truth; conditions are
 * never stored, always derived by the scoring engine.
 */
export interface StorageAdapter {
  readonly kind: "local" | "supabase";
  readonly connected: boolean;
  load(): Promise<AppState | null>;
  save(state: AppState): Promise<void>;
  clear(): Promise<void>;
}

export function emptyState(timezone: string): AppState {
  return {
    version: 2,
    habits: [],
    events: [],
    settings: { timezone, mapOrder: "attention", defaultView: "plants", onboarded: false },
  };
}
