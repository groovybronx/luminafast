import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_FAST_THRESHOLD_PX_S = 500; // px/s above which scroll is considered "fast"
const DEFAULT_IDLE_DELAY_MS = 100; // ms after last scroll event before resetting to idle

interface UseScrollVelocityOptions {
  /** px/s threshold above which `isScrollingFast` is true. Default: 500 */
  threshold?: number;
  /** Milliseconds of scroll inactivity before resetting velocity to 0. Default: 100 */
  idleDelay?: number;
}

interface UseScrollVelocityResult {
  /** Absolute scroll velocity in px/s */
  velocity: number;
  /** true when velocity >= threshold */
  isScrollingFast: boolean;
}

/**
 * Tracks scroll velocity on a given scrollable element.
 *
 * Phase 6.3 — Advanced Grid Virtualization:
 * Exposes `isScrollingFast` so the grid can adapt overscan and defer
 * thumbnail loading when the user is scrolling rapidly.
 */
export function useScrollVelocity(
  scrollRef: React.RefObject<HTMLElement | null>,
  options: UseScrollVelocityOptions = {},
): UseScrollVelocityResult {
  const threshold = options.threshold ?? DEFAULT_FAST_THRESHOLD_PX_S;
  const idleDelay = options.idleDelay ?? DEFAULT_IDLE_DELAY_MS;

  const [velocity, setVelocity] = useState(0);
  const [isScrollingFast, setIsScrollingFast] = useState(false);

  const lastScrollTopRef = useRef(0);
  const lastTimestampRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const now = performance.now();
    const pos = el.scrollTop;
    const dt = now - lastTimestampRef.current;

    if (dt > 0 && lastTimestampRef.current > 0) {
      const v = Math.abs(pos - lastScrollTopRef.current) / (dt / 1000);
      setVelocity(v);
      setIsScrollingFast(v >= threshold);
    }

    lastScrollTopRef.current = pos;
    lastTimestampRef.current = now;

    // Reset to idle state after inactivity
    if (idleTimerRef.current !== null) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      setVelocity(0);
      setIsScrollingFast(false);
    }, idleDelay);
  }, [scrollRef, threshold, idleDelay]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      el.removeEventListener('scroll', handleScroll);
      if (idleTimerRef.current !== null) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [scrollRef, handleScroll]);

  return { velocity, isScrollingFast };
}
