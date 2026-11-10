/**
 * Supabase adapter: NOT YET CONNECTED.
 *
 * This is a stub that documents how the app's state maps to the tables in
 * supabase/schema.sql. It is not used anywhere until NEXT_PUBLIC_SUPABASE_URL
 * and NEXT_PUBLIC_SUPABASE_ANON_KEY are configured and the methods below are
 * implemented with @supabase/supabase-js (auth: magic link / OAuth).
 *
 * Mapping:
 *   Habit        -> public.habits (+ public.habit_goals for versioned goals,
 *                   public.habit_pauses for pause ranges)
 *   HabitEvent   -> public.events (soft delete via deleted_at)
 *   Settings     -> public.profiles
 * Conditions are never stored; they are derived client- or edge-side.
 */
import type { AppState } from "../types";
import type { StorageAdapter } from "./adapter";

export class SupabaseNotConnectedError extends Error {
  constructor() {
    super("Supabase is not connected yet. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY and implement SupabaseAdapter.");
  }
}

export class SupabaseAdapter implements StorageAdapter {
  readonly kind = "supabase" as const;
  readonly connected = false;
  async load(): Promise<AppState | null> {
    // TODO: select from profiles, habits, habit_goals, habit_pauses, events where user_id = auth.uid()
    throw new SupabaseNotConnectedError();
  }
  async save(state: AppState): Promise<void> {
    // TODO: upsert changed rows; events are append-only except deleted_at / edits.
    void state;
    throw new SupabaseNotConnectedError();
  }
  async clear(): Promise<void> {
    throw new SupabaseNotConnectedError();
  }
}

export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
