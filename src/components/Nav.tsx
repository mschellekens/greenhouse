"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/map", label: "Map", icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "/garden", label: "Garden", icon: "M12 20v-8m0 0c-4 0-6-3-6-6 4 0 6 3 6 6Zm0 0c4 0 6-3 6-6-4 0-6 3-6 6Z" },
  { href: "/history", label: "History", icon: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" },
  { href: "/settings", label: "Settings", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.3l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2.2-1.3L14.4 3h-4l-.4 2.6a7.6 7.6 0 0 0-2.2 1.3l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.6l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2.2 1.3l.4 2.6h4l.4-2.6a7.6 7.6 0 0 0 2.2-1.3l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.3Z" },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="pb-safe border-t border-forest/10 bg-cream-50/95 backdrop-blur" aria-label="Main">
      <ul className="mx-auto flex max-w-md justify-around px-2">
        {items.map((it) => {
          const active = path.startsWith(it.href) || (it.href === "/map" && path.startsWith("/habit"));
          return (
            <li key={it.href}>
              <Link href={it.href} className={`flex flex-col items-center gap-0.5 px-4 py-2 text-[11px] font-medium ${active ? "text-forest" : "text-ink-400"}`} aria-current={active ? "page" : undefined}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={it.icon} />
                </svg>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
