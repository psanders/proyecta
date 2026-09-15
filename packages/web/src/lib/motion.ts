/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 *
 * Small motion helpers. Every animation on the site is decorative, so each one checks
 * `prefers-reduced-motion` and falls back to the static design.
 */
import { useEffect, useState } from "react";
import type { RefObject } from "react";

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia(REDUCE_QUERY).matches);
  useEffect(() => {
    const media = window.matchMedia(REDUCE_QUERY);
    const onChange = () => setReduced(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** `inView` follows the element; `seen` latches the first time it enters. */
export function useInView(ref: RefObject<Element | null>, threshold = 0.3) {
  const [state, setState] = useState({ inView: false, seen: false });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const inView = entry?.isIntersecting ?? false;
        setState((prev) => ({ inView, seen: prev.seen || inView }));
      },
      { threshold }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, threshold]);
  return state;
}

/** Counts from 0 to `target` with an ease-out once `start` is true. */
export function useCountUp(target: number, start: boolean, durationMs = 1200): number {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);
  useEffect(() => {
    if (reduced) {
      setValue(target);
      return;
    }
    if (!start) return;
    let frame = 0;
    const begin = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - begin) / durationMs);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, start, durationMs, reduced]);
  return value;
}
