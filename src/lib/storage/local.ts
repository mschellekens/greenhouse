import type { AppState } from "../types";
import type { StorageAdapter } from "./adapter";

const KEY = "greenhouse:v1";

/** Browser localStorage implementation. Survives refreshes; per device only. */
export class LocalStorageAdapter implements StorageAdapter {
  readonly kind = "local" as const;
  readonly connected = true;
  async load(): Promise<AppState | null> {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AppState;
      return parsed.version === 1 ? parsed : null;
    } catch {
      return null;
    }
  }
  async save(state: AppState): Promise<void> {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KEY, JSON.stringify(state));
  }
  async clear(): Promise<void> {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(KEY);
  }
}
