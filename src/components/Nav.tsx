"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { greeting } from "@/lib/format";
import { HOME_VIEWS, loadView, resolveView, saveView, viewPath, type HomeView } from "@/lib/view";

const ICONS = {
  home: "M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1v-7.5Z",
  history: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  settings: "M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6",
};

export function BottomNav() {
  const path = usePathname();
  const home = useHomeHref();
  const items = [
    { href: home.href, label: "Home", icon: ICONS.home, active: /^\/(plants|map|garden|habit)/.test(path) },
    { href: "/history", label: "History", icon: ICONS.history, active: path.startsWith("/history") },
    { href: "/settings", label: "Settings", icon: ICONS.settings, active: path.startsWith("/settings") },
  ];
  return (
    <nav className="pb-safe border-t border-forest/10 bg-ivory/95 backdrop-blur" aria-label="Main">
      <ul className="mx-auto flex max-w-md justify-around px-2">
        {items.map((it) => (
          <li key={it.label}>
            <Link href={it.href} className={`flex min-w-16 flex-col items-center gap-0.5 px-4 py-2 text-[11px] ${it.active ? "font-medium text-forest" : "text-muted-strong"}`} aria-current={it.active ? "page" : undefined}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d={it.icon} />
              </svg>
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Plants · Map · Greenhouse switch on Home, with a one-line caption for the current view. */
export function ViewToggle({ current }: { current: HomeView }) {
  return (
    <div className="flex w-full rounded-full bg-stone p-1 text-[14px]" role="tablist" aria-label="View">
      {HOME_VIEWS.map((v) => (
        <Link
          key={v.id}
          href={viewPath(v.id)}
          role="tab"
          aria-selected={current === v.id}
          onClick={() => saveView(v.id)}
          className={`flex-1 rounded-full px-3 py-2 text-center ${current === v.id ? "bg-white font-medium text-forest shadow-sm" : "text-muted-strong hover:text-forest"}`}
        >
          {v.label}
        </Link>
      ))}
    </div>
  );
}

export function HomeHeader({ current }: { current: HomeView }) {
  const { state } = useApp();
  useEffect(() => saveView(current), [current]);
  const caption = HOME_VIEWS.find((v) => v.id === current)!.caption;
  return (
    <header className="mb-4">
      <h1 className="font-display text-[38px] leading-[1.05] text-forest">{greeting(state.settings.timezone)}</h1>
      <div className="mt-4">
        <ViewToggle current={current} />
      </div>
      <p className="mt-2.5 px-1 text-[13.5px] leading-snug text-muted-strong">{caption}</p>
    </header>
  );
}

/** Home link that goes to the view last used in this browser. */
export function useHomeHref() {
  const { state } = useApp();
  const [v, setV] = useState<HomeView>(() => resolveView(null, state.settings.defaultView));
  const path = usePathname();
  useEffect(() => setV(loadView(state.settings.defaultView)), [path, state.settings.defaultView]);
  return { view: v, href: viewPath(v) };
}
