"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/store";

const ICONS = {
  home: "M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1v-7.5Z",
  history: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  settings: "M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6",
};

export function BottomNav() {
  const path = usePathname();
  const { state } = useApp();
  const items = [
    { href: `/${state.settings.defaultView}`, label: "Home", icon: ICONS.home, active: /^\/(map|garden|habit)/.test(path) },
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

/** Clearly visible Map / Garden switch on the Home screen. */
export function ViewToggle({ current }: { current: "map" | "garden" }) {
  return (
    <div className="inline-flex shrink-0 rounded-full bg-stone p-1 text-[13px]" role="tablist" aria-label="View">
      {(["map", "garden"] as const).map((v) => (
        <Link
          key={v}
          href={`/${v}`}
          role="tab"
          aria-selected={current === v}
          className={`rounded-full px-4 py-1.5 ${current === v ? "bg-white font-medium text-forest shadow-sm" : "text-muted-strong"}`}
        >
          {v === "map" ? "Map" : "Garden"}
        </Link>
      ))}
    </div>
  );
}
