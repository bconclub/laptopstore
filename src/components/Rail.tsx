"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Horizontal carousel: touch/trackpad swipe, mouse drag-to-scroll,
 * and arrow controls that fade at the ends.
 */
export default function Rail({ children, ariaLabel }: { children: ReactNode; ariaLabel: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: false });

  const update = () => {
    const el = track.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  useEffect(() => {
    update();
    const el = track.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  const nudge = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  // Mouse drag-to-scroll (touch already scrolls natively)
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || !track.current) return;
    drag.current = { active: true, startX: e.clientX, startScroll: track.current.scrollLeft, moved: false };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.active || !track.current) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > 4) {
      d.moved = true;
      track.current.setPointerCapture(e.pointerId);
    }
    track.current.scrollLeft = d.startScroll - dx;
  };
  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current.moved) {
      // swallow the click that follows a drag so cards don't navigate
      const stop = (ev: Event) => {
        ev.preventDefault();
        ev.stopPropagation();
      };
      track.current?.addEventListener("click", stop, { capture: true, once: true });
      track.current?.releasePointerCapture?.(e.pointerId);
    }
    drag.current.active = false;
  };

  const btn =
    "absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ink-900 shadow-(--shadow-card-hover) ring-1 ring-line transition-all hover:bg-brand-50 sm:flex disabled:pointer-events-none disabled:opacity-0";

  return (
    <div className="relative" role="region" aria-label={ariaLabel}>
      <button type="button" onClick={() => nudge(-1)} disabled={!canLeft} aria-label="Scroll left" className={`${btn} -left-3`}>
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </button>
      <div
        ref={track}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        className="snap-row no-scrollbar -mx-4 cursor-grab select-none px-4 active:cursor-grabbing sm:mx-0 sm:px-0"
      >
        {children}
      </div>
      <button type="button" onClick={() => nudge(1)} disabled={!canRight} aria-label="Scroll right" className={`${btn} -right-3`}>
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}
