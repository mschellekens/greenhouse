"use client";
import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { ConditionLabel } from "@/components/Condition";
import { goalSentence, currentGoal } from "@/lib/format";
import { INTEGRATIONS } from "@/lib/integrations";

function Row({ label, value, tone = "muted" }: { label: string; value: string; tone?: "ok" | "muted" }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-[14px]">
      <span>{label}</span>
      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12px] ${tone === "ok" ? "bg-sage-100 text-leaf-ink" : "bg-stone text-muted-strong"}`}>{value}</span>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white/70 px-4 py-2">
      <h2 className="pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-muted-strong">{title}</h2>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const app = useApp();
  const [confirmReset, setConfirmReset] = useState(false);
  const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [app.state.settings.timezone];
  // Static GitHub Pages host has no /api/parse, so AI parsing stays off.
  const llm = "Not configured";

  function exportData() {
    const blob = new Blob([JSON.stringify(app.state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `greenhouse-${app.today}.json`;
    a.click();
  }

  const s = app.state.settings;
  return (
    <div className="space-y-4">
      <h1 className="font-display text-[40px] leading-tight text-forest">Settings</h1>

      <Card title="Habits">
        <ul>
          {app.state.habits.map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-2 border-b border-forest/5 py-2.5 last:border-0">
              <Link href={`/habit?id=${h.id}`} className="min-w-0">
                <div className="truncate text-[14px]">
                  {h.name}
                  {h.archivedAt && <span className="ml-1 text-[12px] text-muted-strong">(archived)</span>}
                </div>
                <div className="text-[12px] text-muted-strong">{goalSentence(h.type, currentGoal(h), h.direction)}</div>
              </Link>
              {h.archivedAt ? (
                <button className="text-[13px] text-forest" onClick={() => app.archiveHabit(h.id, false)}>
                  Restore
                </button>
              ) : (
                <ConditionLabel band={app.conditions[h.id].band} score={app.conditions[h.id].score} />
              )}
            </li>
          ))}
        </ul>
        <Link href="/welcome?step=3" className="block py-2.5 text-[14px] text-forest">
          + Add habits
        </Link>
      </Card>

      <Card title="Preferences">
        <label className="flex items-center justify-between py-2.5 text-[14px]">
          Name
          <input value={s.name ?? ""} onChange={(e) => app.setSettings({ name: e.target.value })} className="w-40 rounded-lg border border-forest/15 bg-white px-2 py-1 text-right" placeholder="Optional" />
        </label>
        <div className="flex items-center justify-between py-2.5 text-[14px]">
          Default view
          <div className="flex rounded-full bg-stone p-0.5 text-[12px]">
            {(["map", "garden"] as const).map((v) => (
              <button key={v} onClick={() => app.setSettings({ defaultView: v })} aria-pressed={s.defaultView === v} className={`rounded-full px-3 py-1 ${s.defaultView === v ? "bg-white font-medium shadow-sm" : "text-muted-strong"}`}>
                {v === "map" ? "Map" : "Garden"}
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
        <Row label="Reminders" value="Off" />
        <p className="pb-2 text-[12px] text-muted-strong">Times are stored in UTC; each entry keeps the local day it happened. Reminders stay off by default; a restrained weekly digest is planned.</p>
      </Card>

      <Card title="Integrations">
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

      <Card title="Data">
        <Row label="Stored on this device" value="Active" tone="ok" />
        <Row label="Account & cloud sync" value="Not connected" />
        <Row label="Understanding your words" value="Built-in rules" tone="ok" />
        <Row label="AI language model" value={llm} tone={llm.startsWith("On") ? "ok" : "muted"} />
        <div className="flex flex-col gap-2 py-3">
          <button className="h-11 rounded-full border border-forest/20 text-sm" onClick={exportData}>
            Export my data (JSON)
          </button>
          <button
            className="h-11 rounded-full border border-forest/20 text-sm"
            onClick={() => {
              if (app.state.habits.length && !window.confirm("Replace your current habits and entries with the example greenhouse?")) return;
              app.loadDemo();
            }}
          >
            Load example greenhouse
          </button>
          {confirmReset ? (
            <button className="h-11 rounded-full bg-terracotta-ink text-sm text-white" onClick={() => app.resetAll()}>
              Tap again to erase everything on this device
            </button>
          ) : (
            <button className="h-11 rounded-full text-sm text-terracotta-ink" onClick={() => setConfirmReset(true)}>
              Erase all data
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}
