"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";

const INTEGRATIONS = [
  { name: "Apple Health", what: "Workouts, sleep, steps" },
  { name: "Google Fit / Health Connect", what: "Workouts, steps" },
  { name: "Strava", what: "Runs and rides" },
  { name: "Oura", what: "Sleep" },
  { name: "Google Calendar", what: "Gym sessions, calls" },
];

function Row({ label, value, tone = "muted" }: { label: string; value: string; tone?: "ok" | "muted" }) {
  return (
    <div className="flex items-center justify-between py-2.5 text-sm">
      <span>{label}</span>
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tone === "ok" ? "bg-sage-100 text-forest" : "bg-cream-200 text-ink-500"}`}>{value}</span>
    </div>
  );
}

export default function SettingsPage() {
  const app = useApp();
  const [llm, setLlm] = useState<string>("Checking…");
  const [confirmReset, setConfirmReset] = useState(false);
  const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [app.state.settings.timezone];
  useEffect(() => {
    fetch("/api/parse")
      .then((r) => r.json())
      .then((j) => setLlm(j.available ? `On (${j.provider})` : "Not configured"))
      .catch(() => setLlm("Not configured"));
  }, []);
  const archived = app.state.habits.filter((h) => h.archivedAt);

  function exportData() {
    const blob = new Blob([JSON.stringify(app.state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `greenhouse-${app.today}.json`;
    a.click();
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl text-forest">Settings</h1>

      <section className="rounded-3xl bg-white px-4 py-2 shadow-sm">
        <label className="flex items-center justify-between py-2.5 text-sm">
          Name
          <input value={app.state.settings.name ?? ""} onChange={(e) => app.setSettings({ name: e.target.value })} className="w-40 rounded-lg border border-forest/15 px-2 py-1 text-right" placeholder="Optional" />
        </label>
        <label className="flex items-center justify-between py-2.5 text-sm">
          Time zone
          <select value={app.state.settings.timezone} onChange={(e) => app.setSettings({ timezone: e.target.value })} className="w-48 rounded-lg border border-forest/15 bg-white px-2 py-1 text-right">
            {zones.map((z) => (
              <option key={z}>{z}</option>
            ))}
          </select>
        </label>
        <p className="pb-2 text-xs text-ink-400">Entries keep the calendar day they were logged on. Changing zones won&apos;t move past entries.</p>
      </section>

      <section className="rounded-3xl bg-white px-4 py-2 shadow-sm">
        <h2 className="pt-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Data &amp; parsing</h2>
        <Row label="Storage on this device" value="Active" tone="ok" />
        <Row label="Cloud sync (Supabase)" value="Not connected" />
        <Row label="Understanding your words" value="Built-in rules" tone="ok" />
        <Row label="AI parsing (LLM)" value={llm} tone={llm.startsWith("On") ? "ok" : "muted"} />
        <p className="pb-2 text-xs text-ink-400">Without cloud sync, data lives only in this browser. Export it before clearing browser data.</p>
      </section>

      <section className="rounded-3xl bg-white px-4 py-2 shadow-sm">
        <h2 className="pt-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Integrations</h2>
        {INTEGRATIONS.map((i) => (
          <div key={i.name} className="flex items-center justify-between py-2.5 text-sm">
            <div>
              <div>{i.name}</div>
              <div className="text-xs text-ink-400">{i.what}</div>
            </div>
            <span className="rounded-full bg-cream-200 px-2.5 py-0.5 text-xs text-ink-500">Not connected · coming later</span>
          </div>
        ))}
        <p className="pb-2 text-xs text-ink-400">None of these are connected. Nothing is imported automatically yet.</p>
      </section>

      {archived.length > 0 && (
        <section className="rounded-3xl bg-white px-4 py-2 shadow-sm">
          <h2 className="pt-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Archive</h2>
          {archived.map((h) => (
            <div key={h.id} className="flex items-center justify-between py-2.5 text-sm">
              <Link href={`/habit/${h.id}`}>{h.name}</Link>
              <button className="text-forest" onClick={() => app.archiveHabit(h.id, false)}>
                Restore
              </button>
            </div>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <button className="h-11 rounded-full border border-forest/20 text-sm font-medium" onClick={() => {
            if (app.state.habits.length && !window.confirm("Replace your current habits and logs with the example greenhouse?")) return;
            app.loadDemo();
          }}>
          Load example greenhouse
        </button>
        <button className="h-11 rounded-full border border-forest/20 text-sm font-medium" onClick={exportData}>
          Export my data (JSON)
        </button>
        {confirmReset ? (
          <button className="h-11 rounded-full bg-clay text-sm font-semibold text-white" onClick={() => app.resetAll()}>
            Tap again to erase everything
          </button>
        ) : (
          <button className="h-11 rounded-full text-sm font-medium text-clay" onClick={() => setConfirmReset(true)}>
            Erase all data
          </button>
        )}
      </section>
    </div>
  );
}
