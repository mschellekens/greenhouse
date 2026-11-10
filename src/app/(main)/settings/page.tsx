"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { ConditionLabel } from "@/components/Condition";
import { goalSentence, currentGoal } from "@/lib/format";
import { INTEGRATIONS } from "@/lib/integrations";
import { SortableList } from "@/components/SortableList";
import { makeBackup, parseBackup } from "@/lib/backup";
import { ALL_DAYS, DEFAULT_REMINDERS, defaultReminder } from "@/lib/reminders";
import type { Habit, ReminderSettings } from "@/lib/types";
import { canPromptInstall, isIOS, isStandalone, notifySupport, onInstallChange, promptInstall, showNotification, type NotifySupport } from "@/lib/pwa";
import { loadLlmConfig, saveLlmConfig, type LlmConfig } from "@/lib/parser/browser";
import { callLLM, DEFAULT_MODEL, type LlmProvider } from "@/lib/parser/llmCore";
import { HOME_VIEWS, loadView, saveView, type HomeView } from "@/lib/view";

function Row({ label, value, tone = "muted" }: { label: string; value: string; tone?: "ok" | "muted" }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-[14px]">
      <span>{label}</span>
      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12px] ${tone === "ok" ? "bg-sage-100 text-leaf-ink" : "bg-stone text-muted-strong"}`}>{value}</span>
    </div>
  );
}

function Card({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white/70 px-4 py-2" aria-labelledby={id ? `${id}-h` : undefined} id={id}>
      <h2 id={id ? `${id}-h` : undefined} className="pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-muted-strong">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "bg-leaf-ink" : "bg-forest/20"}`}>
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

const Btn = ({ children, onClick, tone = "outline", disabled }: { children: React.ReactNode; onClick?: () => void; tone?: "outline" | "solid" | "danger" | "plain"; disabled?: boolean }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={`h-11 rounded-full px-4 text-sm disabled:opacity-40 ${tone === "solid" ? "bg-forest text-ivory" : tone === "danger" ? "bg-terracotta-ink text-white" : tone === "plain" ? "text-terracotta-ink" : "border border-forest/20"}`}
  >
    {children}
  </button>
);

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function InstallCard() {
  const [, force] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [offline, setOffline] = useState<"ready" | "pending" | "unsupported">("pending");
  useEffect(() => {
    setMounted(true);
    const off = onInstallChange(() => force((x) => x + 1));
    if (!("serviceWorker" in navigator)) setOffline("unsupported");
    else navigator.serviceWorker.ready.then(() => setOffline("ready"));
    return off;
  }, []);
  if (!mounted) return null;
  const standalone = isStandalone();
  const ios = isIOS();
  return (
    <Card title="Install & offline" id="install">
      <Row label="Works offline" value={offline === "ready" ? "Ready" : offline === "pending" ? "Preparing…" : "Not supported here"} tone={offline === "ready" ? "ok" : "muted"} />
      <Row label="On your home screen" value={standalone ? "Installed" : "Not yet"} tone={standalone ? "ok" : "muted"} />
      {!standalone && (
        <div className="pb-3 text-[13px] text-muted-strong">
          {canPromptInstall() ? (
            <Btn tone="solid" onClick={() => void promptInstall()}>
              Install Greenhouse
            </Btn>
          ) : ios ? (
            <p>
              On iPhone or iPad: open this page in Safari, tap <strong className="font-medium text-forest">Share</strong>, then <strong className="font-medium text-forest">Add to Home Screen</strong>. It opens full screen and works offline.
            </p>
          ) : (
            <p>
              On Android: open the browser menu (⋮) and choose <strong className="font-medium text-forest">Install app</strong> or <strong className="font-medium text-forest">Add to Home screen</strong>. On desktop Chrome or Edge, use the install icon in the address bar.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

function RemindersCard() {
  const app = useApp();
  const r: ReminderSettings = app.state.settings.reminders ?? DEFAULT_REMINDERS;
  const [support, setSupport] = useState<NotifySupport>("unsupported");
  const [perm, setPerm] = useState<NotificationPermission | "none">("none");
  useEffect(() => {
    setSupport(notifySupport());
    if (typeof Notification !== "undefined") setPerm(Notification.permission);
  }, []);
  const set = (patch: Partial<ReminderSettings>) => app.setSettings({ reminders: { ...r, ...patch } });
  const setHabit = (h: Habit, rem: ReminderSettings["byHabit"][string] | null) => {
    const byHabit = { ...r.byHabit };
    if (rem) byHabit[h.id] = rem;
    else delete byHabit[h.id];
    set({ byHabit });
  };

  async function enable(on: boolean) {
    if (!on) return set({ enabled: false });
    if (support !== "ok") return;
    const p = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
    setPerm(p);
    if (p !== "granted") return;
    const byHabit = Object.keys(r.byHabit).length ? r.byHabit : Object.fromEntries(app.activeHabits.map((h) => [h.id, defaultReminder(h)]));
    set({ enabled: true, byHabit });
  }

  return (
    <Card title="Reminders" id="reminders">
      <div className="flex items-center justify-between gap-3 py-2.5 text-[14px]">
        <div>
          <div>Gentle reminders</div>
          <div className="text-[12px] text-muted-strong">At most one per habit a day. Off by default.</div>
        </div>
        <Toggle on={r.enabled && perm === "granted"} onChange={(v) => void enable(v)} label="Gentle reminders" />
      </div>
      {support === "needs-install" && (
        <p className="pb-2 text-[12px] text-muted-strong">
          On iPhone, notifications only work once Greenhouse is on your Home Screen (iOS 16.4 or later). Add it from Safari’s Share menu, open it from the Home Screen, then turn reminders on here.
        </p>
      )}
      {support === "unsupported" && <p className="pb-2 text-[12px] text-muted-strong">This browser can’t show notifications.</p>}
      {(support === "denied" || perm === "denied") && <p className="pb-2 text-[12px] text-muted-strong">Notifications are blocked for this site. Allow them in your browser’s site settings, then try again.</p>}
      {r.enabled && perm === "granted" && (
        <>
          <ul className="border-t border-forest/5">
            {app.activeHabits.map((h) => {
              const rem = r.byHabit[h.id];
              return (
                <li key={h.id} className="border-b border-forest/5 py-2.5 last:border-0">
                  <div className="flex items-center justify-between gap-2 text-[14px]">
                    <span className="min-w-0 truncate">{h.name}</span>
                    <div className="flex items-center gap-2">
                      {rem && (
                        <input
                          type="time"
                          value={rem.time}
                          aria-label={`Reminder time for ${h.name}`}
                          onChange={(e) => e.target.value && setHabit(h, { ...rem, time: e.target.value })}
                          className="rounded-lg border border-forest/15 bg-white px-2 py-1 text-[13px]"
                        />
                      )}
                      <Toggle on={!!rem} onChange={(v) => setHabit(h, v ? defaultReminder(h) : null)} label={`Remind me about ${h.name}`} />
                    </div>
                  </div>
                  {rem && (
                    <div className="mt-2 flex gap-1" role="group" aria-label={`Reminder days for ${h.name}`}>
                      {ALL_DAYS.map((d) => {
                        const on = rem.days.includes(d);
                        return (
                          <button
                            key={d}
                            type="button"
                            aria-label={DAY_NAMES[d]}
                            aria-pressed={on}
                            onClick={() => setHabit(h, { ...rem, days: on ? rem.days.filter((x) => x !== d) : [...rem.days, d] })}
                            className={`h-8 w-8 rounded-full border text-[12px] ${on ? "border-forest bg-forest text-ivory" : "border-forest/15 bg-white"}`}
                          >
                            {DAY_LETTERS[d]}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between gap-3 py-2.5 text-[14px]">
            <span>Skip if already logged that day</span>
            <Toggle on={r.skipIfLogged} onChange={(v) => set({ skipIfLogged: v })} label="Skip if already logged that day" />
          </div>
          <div className="pb-2">
            <Btn onClick={() => void showNotification("Greenhouse", { body: "Reminders are on. This is what they look like.", tag: "gh-test" })}>Send a test reminder</Btn>
          </div>
        </>
      )}
      <p className="pb-2 text-[12px] text-muted-strong">
        Reminders come from this device, with no server. They show while Greenhouse is open or running in the background. An installed app on Android may also get them while closed, when the browser allows a background check. Paused habits never remind you.
      </p>
    </Card>
  );
}

function AiCard() {
  const [cfg, setCfg] = useState<LlmConfig | null>(null);
  const [provider, setProvider] = useState<LlmProvider>("openai");
  const [key, setKey] = useState("");
  const [model, setModel] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const c = loadLlmConfig();
    setCfg(c);
    if (c) {
      setProvider(c.provider);
      setModel(c.model ?? "");
    }
  }, []);

  async function save() {
    const k = key.trim();
    if (k.length < 8) return setMsg("That key looks too short.");
    setBusy(true);
    setMsg("Checking the key…");
    try {
      const out = await callLLM({ provider, apiKey: k, model: model.trim() || undefined, browser: true, system: 'Reply with only {"ok":true}', user: "ping" });
      if (!out.includes("ok")) throw new Error("unexpected reply");
      const c = { provider, apiKey: k, model: model.trim() || undefined };
      saveLlmConfig(c);
      setCfg(c);
      setKey("");
      setMsg("Saved. Greenhouse will use it to understand what you type, and fall back to the built-in rules if it ever fails.");
    } catch (e) {
      setMsg(`That didn’t work (${String((e as Error).message ?? e)}). Nothing was saved.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Understanding your words" id="ai">
      <Row label="Built-in rules" value="Always on" tone="ok" />
      <Row label="AI language model" value={cfg ? `On · ${cfg.provider === "openai" ? "OpenAI" : "Anthropic"}` : "Off"} tone={cfg ? "ok" : "muted"} />
      <details className="pb-2 text-[13px]">
        <summary className="cursor-pointer py-1.5 text-forest">{cfg ? "Change or remove your key" : "Use your own API key (optional)"}</summary>
        <div className="space-y-2 pt-2">
          <div className="flex rounded-full bg-stone p-0.5 text-[12px]" role="radiogroup" aria-label="Provider">
            {(["openai", "anthropic"] as const).map((p) => (
              <button key={p} type="button" role="radio" aria-checked={provider === p} onClick={() => setProvider(p)} className={`flex-1 rounded-full px-3 py-1.5 ${provider === p ? "bg-white font-medium shadow-sm" : "text-muted-strong"}`}>
                {p === "openai" ? "OpenAI" : "Anthropic"}
              </button>
            ))}
          </div>
          <label className="block text-muted-strong">
            API key
            <input type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder={cfg ? "•••••••• saved" : provider === "openai" ? "sk-…" : "sk-ant-…"} className="mt-1 block w-full rounded-lg border border-forest/15 bg-white px-3 py-2 text-[14px] text-forest" />
          </label>
          <label className="block text-muted-strong">
            Model (optional)
            <input value={model} onChange={(e) => setModel(e.target.value)} placeholder={DEFAULT_MODEL[provider]} className="mt-1 block w-full rounded-lg border border-forest/15 bg-white px-3 py-2 text-[14px] text-forest" />
          </label>
          <div className="flex flex-wrap gap-2">
            <Btn tone="solid" onClick={() => void save()} disabled={busy || !key.trim()}>
              Check and save
            </Btn>
            {cfg && (
              <Btn
                tone="plain"
                onClick={() => {
                  saveLlmConfig(null);
                  setCfg(null);
                  setMsg("Key removed. Back to the built-in rules.");
                }}
              >
                Remove key
              </Btn>
            )}
          </div>
          {msg && (
            <p className="text-[12px] text-forest" aria-live="polite">
              {msg}
            </p>
          )}
          <p className="text-[12px] text-muted-strong">
            The key stays in this browser only and is sent straight to {provider === "openai" ? "OpenAI" : "Anthropic"}, never to us. Anyone using this browser could read it, so use a key with a spending limit. Every AI answer is checked against your habits and your own words: dates in the future, unknown habits or numbers you didn’t type are rejected, and the built-in rules take over.
          </p>
        </div>
      </details>
    </Card>
  );
}

function DataCard() {
  const app = useApp();
  const [confirmReset, setConfirmReset] = useState(false);
  const [msg, setMsg] = useState("");
  const file = useRef<HTMLInputElement>(null);

  function exportData() {
    const blob = new Blob([JSON.stringify(makeBackup(app.state), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `greenhouse-backup-${app.today}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    setMsg(`Backup saved: ${app.state.habits.length} habits, ${app.state.events.filter((e) => !e.deletedAt).length} entries.`);
  }

  async function importFile(f: File) {
    const r = parseBackup(await f.text());
    if (!r.ok) return setMsg(r.error);
    if (app.state.habits.length && !window.confirm(`Replace everything on this device with this backup (${r.habits} habits, ${r.events} entries)?`)) return;
    app.importState(r.state);
    setMsg(`Imported ${r.habits} habits and ${r.events} entries${r.dropped ? ` (${r.dropped} unreadable entries skipped)` : ""}.`);
  }

  return (
    <Card title="Your data" id="data">
      <Row label="Stored on this device" value="Active" tone="ok" />
      <Row label="Account & cloud sync" value="Not connected" />
      <p className="pb-1 text-[12px] text-muted-strong">Everything lives in this browser. Back up regularly, and use a backup to move to another phone or browser. Accounts and sync are planned.</p>
      <div className="flex flex-col gap-2 py-3">
        <Btn onClick={exportData}>Export backup (JSON)</Btn>
        <Btn onClick={() => file.current?.click()}>Import a backup…</Btn>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-label="Choose a backup file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importFile(f);
            e.target.value = "";
          }}
        />
        <Btn
          onClick={() => {
            if (app.state.habits.length && !window.confirm("Replace your current habits and entries with the example greenhouse?")) return;
            app.loadDemo();
            setMsg("Example greenhouse loaded.");
          }}
        >
          Load example greenhouse
        </Btn>
        {confirmReset ? (
          <div className="flex gap-2">
            <Btn tone="danger" onClick={() => app.resetAll()}>
              Erase everything on this device
            </Btn>
            <Btn onClick={() => setConfirmReset(false)}>Cancel</Btn>
          </div>
        ) : (
          <Btn tone="plain" onClick={() => setConfirmReset(true)}>
            Erase all data…
          </Btn>
        )}
        {msg && (
          <p className="text-center text-[12px] text-forest" aria-live="polite">
            {msg}
          </p>
        )}
      </div>
    </Card>
  );
}

export default function SettingsPage() {
  const app = useApp();
  const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [app.state.settings.timezone];
  const s = app.state.settings;
  const archived = app.state.habits.filter((h) => h.archivedAt);
  const [homeView, setHomeView] = useState<HomeView>("plants");
  useEffect(() => setHomeView(loadView(s.defaultView)), [s.defaultView]);
  return (
    <div className="space-y-4">
      <h1 className="font-display text-[40px] leading-tight text-forest">Settings</h1>

      <Card title="Habits" id="habits">
        {app.activeHabits.length ? (
          <SortableList
            items={app.activeHabits}
            label={(h) => h.name}
            onReorder={app.reorderHabits}
            render={(h) => (
              <Link href={`/habit?id=${h.id}`} className="block min-w-0 rounded-lg py-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[14px]">{h.name}</span>
                  <ConditionLabel band={app.conditions[h.id].band} score={app.conditions[h.id].score} className="shrink-0 scale-90" />
                </div>
                <div className="truncate text-[12px] text-muted-strong">{goalSentence(h.type, currentGoal(h), h.direction)}</div>
              </Link>
            )}
          />
        ) : (
          <p className="py-2 text-[13px] text-muted-strong">No habits yet.</p>
        )}
        <p className="text-[12px] text-muted-strong">Drag the handle to set your Custom order on Home and the bench order in the Garden.</p>
        {archived.length > 0 && (
          <div className="mt-2 border-t border-forest/5 pt-1">
            <h3 className="py-1 text-[12px] text-muted-strong">Archived (history kept)</h3>
            {archived.map((h) => (
              <div key={h.id} className="flex items-center justify-between py-2 text-[14px]">
                <Link href={`/habit?id=${h.id}`} className="truncate">
                  {h.name}
                </Link>
                <button className="h-9 rounded-full px-3 text-[13px] text-forest" onClick={() => app.archiveHabit(h.id, false)}>
                  Restore
                </button>
              </div>
            ))}
          </div>
        )}
        <Link href="/welcome?step=3" className="block py-2.5 text-[14px] text-forest">
          + Add habits
        </Link>
      </Card>

      <Link href="/intro?replay=1" className="flex items-center justify-between rounded-3xl bg-white/70 px-4 py-4 text-[14px]">
        <span>
          <span className="block font-medium text-forest">How Greenhouse works</span>
          <span className="text-[12px] text-muted-strong">Three short screens on balance, rhythm and care.</span>
        </span>
        <span aria-hidden className="text-muted-strong">›</span>
      </Link>

      <InstallCard />
      <RemindersCard />

      <Card title="Preferences" id="prefs">
        <label className="flex items-center justify-between py-2.5 text-[14px]">
          Name
          <input value={s.name ?? ""} onChange={(e) => app.setSettings({ name: e.target.value })} className="w-40 rounded-lg border border-forest/15 bg-white px-2 py-1 text-right" placeholder="Optional" />
        </label>
        <div className="flex items-center justify-between py-2.5 text-[14px]">
          <span id="dv">Home view</span>
          <div className="flex rounded-full bg-stone p-0.5 text-[12px]" role="radiogroup" aria-labelledby="dv">
            {HOME_VIEWS.map((v) => (
              <button
                key={v.id}
                role="radio"
                aria-checked={homeView === v.id}
                onClick={() => {
                  app.setSettings({ defaultView: v.id });
                  saveView(v.id);
                  setHomeView(v.id);
                }}
                className={`rounded-full px-3 py-1 ${homeView === v.id ? "bg-white font-medium shadow-sm" : "text-muted-strong"}`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center justify-between py-2.5 text-[14px]">
          Time zone
          <select value={s.timezone} onChange={(e) => app.setSettings({ timezone: e.target.value })} className="w-48 rounded-lg border border-forest/15 bg-white px-2 py-1 text-right">
            {zones.map((z) => (
              <option key={z}>{z}</option>
            ))}
          </select>
        </label>
        <p className="pb-2 text-[12px] text-muted-strong">Entries keep the local day they happened on, so travelling never moves past activity to another day.</p>
      </Card>

      <AiCard />

      <Card title="Integrations" id="integrations">
        {INTEGRATIONS.map((i) => (
          <div key={i.name} className="flex items-center justify-between gap-3 py-2.5 text-[14px]">
            <div>
              <div>{i.name}</div>
              <div className="text-[12px] text-muted-strong">Could help with: {i.helps}</div>
            </div>
            <span className="shrink-0 rounded-full bg-stone px-2.5 py-0.5 text-[12px] text-muted-strong">Not available yet</span>
          </div>
        ))}
        <p className="pb-2 text-[12px] text-muted-strong">Nothing is connected and nothing is imported automatically. When integrations arrive they will be opt-in, ask only for what they need, and mark imported entries with their source.</p>
      </Card>

      <DataCard />
      <p className="pb-2 text-center text-[11px] text-muted-strong">
        Greenhouse · data stays on this device ·{" "}
        <a className="underline" href="https://github.com/mschellekens/greenhouse">
          source
        </a>
      </p>
    </div>
  );
}
