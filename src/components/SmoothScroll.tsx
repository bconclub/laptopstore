"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Lenis buttery smooth scrolling. Runs for everyone (gentle lerp — smooth
 * scroll is not a vestibular trigger); big looping/parallax motion is still
 * gated behind prefers-reduced-motion in CSS.
 */
export default function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.1,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      anchors: true,
    });
    return () => lenis.destroy();
  }, []);
  return null;
}
