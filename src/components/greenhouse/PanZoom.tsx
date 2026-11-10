"use client";
/**
 * Drag to pan, pinch / ctrl-wheel / buttons to zoom. Taps still reach the
 * content; a drag never turns into a tap.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

interface View {
  k: number;
  x: number;
  y: number;
}

export function PanZoom({
  width,
  height,
  viewportHeight,
  initialFocusX = 0.5,
  children,
}: {
  width: number;
  height: number;
  /** css px; the box is as wide as its parent */
  viewportHeight: (boxWidth: number) => number;
  initialFocusX?: number;
  /** content, or a render function that receives the current zoom (css px per scene unit) */
  children: React.ReactNode | ((view: { k: number; x: number; y: number; w: number; h: number; moving: boolean }) => React.ReactNode);
}) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View | null>(null);
  const [active, setActive] = useState(true);
  const [dragging, setDragging] = useState(false);
  // pause plant animations while off screen or while the user is dragging
  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: boolean; start?: View; dist?: number; mid?: { x: number; y: number }; origin?: { x: number; y: number } }>({ moved: false });

  const fit = useCallback((w: number, h: number) => Math.max(h / height, w / width), [width, height]);
  const clamp = useCallback(
    (v: View, w = size.w, h = size.h): View => {
      const kMin = fit(w, h);
      const k = Math.min(Math.max(v.k, kMin), kMin * 3.2);
      const x = Math.min(0, Math.max(w - width * k, v.x));
      const y = Math.min(0, Math.max(h - height * k, v.y));
      return { k, x, y };
    },
    [fit, size.w, size.h, width, height],
  );

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = Math.round(viewportHeight(w));
      setSize({ w, h });
      setView((prev) => {
        const k = fit(w, h);
        if (prev) return clamp(prev, w, h);
        return clamp({ k, x: w / 2 - width * k * initialFocusX, y: 0 }, w, h);
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  const zoomAt = useCallback(
    (factor: number, cx: number, cy: number) =>
      setView((v) => {
        if (!v) return v;
        const k = v.k * factor;
        const nv = { k, x: cx - ((cx - v.x) * k) / v.k, y: cy - ((cy - v.y) * k) / v.k };
        return clamp(nv);
      }),
    [clamp],
  );

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) {
        // horizontal trackpad swipes pan; vertical wheel scrolls the page
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
          e.preventDefault();
          setView((v) => (v ? clamp({ ...v, x: v.x - e.deltaX }) : v));
        }
        return;
      }
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [clamp, zoomAt]);

  const local = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, local(e));
    gesture.current = { moved: false, start: view ?? undefined, origin: local(e) };
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current.dist = Math.hypot(a.x - b.x, a.y - b.y);
      gesture.current.mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
  };
  const onMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    const g = gesture.current;
    if (!g.start || !g.origin) return;
    if (pointers.current.size === 1) {
      const dx = p.x - g.origin.x;
      const dy = p.y - g.origin.y;
      if (!g.moved && Math.hypot(dx, dy) > 6) {
        g.moved = true;
        setDragging(true);
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }
      if (g.moved) setView(clamp({ ...g.start, x: g.start.x + dx, y: g.start.y + dy }));
    } else if (pointers.current.size === 2 && g.dist && g.mid) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      g.moved = true;
      if (!dragging) setDragging(true);
      const k = g.start.k * (dist / g.dist);
      setView(clamp({ k, x: mid.x - ((g.mid.x - g.start.x) * k) / g.start.k, y: mid.y - ((g.mid.y - g.start.y) * k) / g.start.k }));
    }
  };
  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) setDragging(false);
    if (pointers.current.size === 1) {
      const [p] = [...pointers.current.values()];
      gesture.current = { moved: true, start: view ?? undefined, origin: p };
    }
  };
  const onClickCapture = (e: React.MouseEvent) => {
    if (gesture.current.moved) {
      e.stopPropagation();
      e.preventDefault();
      gesture.current.moved = false;
    }
  };

  const kMin = size.w ? fit(size.w, size.h) : 1;
  return (
    <div className="relative">
      <div
        ref={box}
        className={`relative touch-none select-none overflow-hidden ${active && !dragging ? "" : "gh-paused"}`}
        style={{ height: size.h || undefined, cursor: "grab" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClickCapture={onClickCapture}
        tabIndex={0}
        role="group"
        aria-label="Greenhouse view. Use arrow keys to look around, plus and minus to zoom."
        onKeyDown={(e) => {
          const step = 60;
          const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
          if (moves[e.key] && view) {
            e.preventDefault();
            setView(clamp({ ...view, x: view.x + moves[e.key][0], y: view.y + moves[e.key][1] }));
          } else if (e.key === "+" || e.key === "=") {
            e.preventDefault();
            zoomAt(1.25, size.w / 2, size.h / 2);
          } else if (e.key === "-") {
            e.preventDefault();
            zoomAt(0.8, size.w / 2, size.h / 2);
          }
        }}
      >
        {view && (
          <div style={{ position: "relative", width, height, transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.k})`, transformOrigin: "0 0", willChange: "transform" }}>{typeof children === "function" ? children({ ...view, w: size.w, h: size.h, moving: dragging }) : children}</div>
        )}
      </div>
      <div className="absolute bottom-3 right-3 flex gap-1.5">
        {[
          ["−", 1 / 1.4, "Zoom out"],
          ["+", 1.4, "Zoom in"],
        ].map(([l, f, label]) => (
          <button
            key={label as string}
            aria-label={label as string}
            className="h-9 w-9 rounded-full bg-ivory/90 text-[18px] leading-none text-forest shadow-sm backdrop-blur hover:bg-white"
            onClick={() => zoomAt(f as number, size.w / 2, size.h / 2)}
          >
            {l}
          </button>
        ))}
        {view && view.k > kMin * 1.05 && (
          <button className="h-9 rounded-full bg-ivory/90 px-3 text-[12px] text-forest shadow-sm backdrop-blur hover:bg-white" onClick={() => setView(clamp({ k: kMin, x: size.w / 2 - width * kMin * 0.5, y: 0 }))}>
            Fit
          </button>
        )}
      </div>
    </div>
  );
}
