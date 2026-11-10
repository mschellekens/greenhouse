"use client";
import { useRef, useState } from "react";
import { dropIndex, moveItem } from "@/lib/order";

interface Drag {
  id: string;
  from: number;
  to: number;
  startY: number;
  dy: number;
  mids: number[];
  heights: number[];
}

/**
 * Vertical list you can reorder by dragging the handle (mouse, touch or pen),
 * with arrow keys on the handle, or with the explicit move buttons.
 */
export function SortableList<T extends { id: string }>({
  items,
  label,
  onReorder,
  render,
}: {
  items: T[];
  label: (item: T) => string;
  onReorder: (ids: string[]) => void;
  render: (item: T) => React.ReactNode;
}) {
  const rows = useRef(new Map<string, HTMLLIElement>());
  const [drag, setDrag] = useState<Drag | null>(null);
  const [live, setLive] = useState("");
  const ids = items.map((i) => i.id);

  const commit = (from: number, to: number) => {
    if (from === to) return;
    onReorder(moveItem(ids, from, to));
    setLive(`${label(items[from])} moved to position ${to + 1} of ${items.length}.`);
  };

  const start = (e: React.PointerEvent, item: T, from: number) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const rects = ids.map((id) => rows.current.get(id)!.getBoundingClientRect());
    setDrag({ id: item.id, from, to: from, startY: e.clientY, dy: 0, mids: rects.map((r) => r.top + r.height / 2), heights: rects.map((r) => r.height) });
  };
  const move = (e: React.PointerEvent) => {
    if (!drag) return;
    const dy = e.clientY - drag.startY;
    const centre = drag.mids[drag.from] + dy;
    setDrag({ ...drag, dy, to: dropIndex(centre, drag.mids, drag.from) });
  };
  const end = () => {
    if (!drag) return;
    commit(drag.from, drag.to);
    setDrag(null);
  };

  const shift = (i: number) => {
    if (!drag || i === drag.from) return 0;
    const h = drag.heights[drag.from];
    if (drag.from < drag.to && i > drag.from && i <= drag.to) return -h;
    if (drag.from > drag.to && i < drag.from && i >= drag.to) return h;
    return 0;
  };

  return (
    <>
      <ul className="relative">
        {items.map((item, i) => {
          const dragging = drag?.id === item.id;
          return (
            <li
              key={item.id}
              ref={(el) => {
                if (el) rows.current.set(item.id, el);
                else rows.current.delete(item.id);
              }}
              className={`flex items-center gap-1 border-b border-forest/5 py-1.5 last:border-0 ${dragging ? "relative z-10 rounded-2xl bg-white shadow-lg" : ""}`}
              style={{ transform: `translateY(${dragging ? drag!.dy : shift(i)}px)`, transition: dragging ? "none" : drag ? "transform 160ms ease" : undefined }}
            >
              <button
                type="button"
                className="flex h-11 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-strong active:cursor-grabbing"
                aria-label={`Reorder ${label(item)}. Drag, or use the up and down arrow keys.`}
                onPointerDown={(e) => start(e, item, i)}
                onPointerMove={move}
                onPointerUp={end}
                onPointerCancel={() => setDrag(null)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp" && i > 0) {
                    e.preventDefault();
                    commit(i, i - 1);
                  } else if (e.key === "ArrowDown" && i < items.length - 1) {
                    e.preventDefault();
                    commit(i, i + 1);
                  }
                }}
              >
                <svg width="14" height="18" viewBox="0 0 14 18" aria-hidden>
                  {[3, 9, 15].map((y) => [4, 10].map((x) => <circle key={`${x}${y}`} cx={x} cy={y} r={1.6} fill="currentColor" />))}
                </svg>
              </button>
              <div className="min-w-0 flex-1">{render(item)}</div>
              <div className="flex shrink-0 gap-0.5">
                <button type="button" className="h-9 w-9 rounded-full text-muted-strong hover:bg-stone disabled:opacity-30" aria-label={`Move ${label(item)} up`} disabled={i === 0} onClick={() => commit(i, i - 1)}>
                  ↑
                </button>
                <button type="button" className="h-9 w-9 rounded-full text-muted-strong hover:bg-stone disabled:opacity-30" aria-label={`Move ${label(item)} down`} disabled={i === items.length - 1} onClick={() => commit(i, i + 1)}>
                  ↓
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="sr-only" aria-live="polite">
        {live}
      </p>
    </>
  );
}
