/**
 * useScrollVelocity Hook Tests — Phase 6.3
 *
 * Tests for scroll velocity tracking:
 * - Initial state (not fast)
 * - Velocity calculation from scroll events
 * - isScrollingFast threshold detection
 * - Idle reset after delay
 * - Cleanup on unmount
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRef } from 'react';
import { useScrollVelocity } from '@/hooks/useScrollVelocity';

// Utility: build a fake scrollable element at a given scrollTop
function makeFakeEl(scrollTop: number): HTMLDivElement {
  const el = document.createElement('div');
  Object.defineProperty(el, 'scrollTop', { value: scrollTop, writable: true });
  return el;
}

describe('useScrollVelocity', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Mock performance.now to control timestamps
    let time = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => time++);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('retourne velocity=0 et isScrollingFast=false par défaut', () => {
    const el = makeFakeEl(0);
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(el);
      return useScrollVelocity(ref);
    });

    expect(result.current.velocity).toBe(0);
    expect(result.current.isScrollingFast).toBe(false);
  });

  it('retourne velocity=0 si scrollRef.current est null', () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement | null>(null);
      return useScrollVelocity(ref);
    });

    expect(result.current.velocity).toBe(0);
    expect(result.current.isScrollingFast).toBe(false);
  });

  it('détecte isScrollingFast=true quand la vélocité dépasse le seuil', () => {
    const el = makeFakeEl(0);
    // Override performance.now avec des timestamps précis
    let currentTime = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => currentTime);

    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(el);
      return useScrollVelocity(ref, { threshold: 500 });
    });

    // Premier scroll event : initialise lastScrollTop et lastTimestamp
    act(() => {
      currentTime = 1000;
      (el as HTMLElement & { scrollTop: number }).scrollTop = 0;
      el.dispatchEvent(new Event('scroll'));
    });

    // Deuxième scroll : 600px en 1000ms → 600 px/s > 500 seuil
    act(() => {
      currentTime = 2000; // +1000ms
      (el as HTMLElement & { scrollTop: number }).scrollTop = 600;
      el.dispatchEvent(new Event('scroll'));
    });

    expect(result.current.isScrollingFast).toBe(true);
    expect(result.current.velocity).toBeGreaterThan(500);
  });

  it('détecte isScrollingFast=false quand la vélocité est sous le seuil', () => {
    const el = makeFakeEl(0);
    let currentTime = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => currentTime);

    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(el);
      return useScrollVelocity(ref, { threshold: 500 });
    });

    // Initialisation
    act(() => {
      currentTime = 1000;
      (el as HTMLElement & { scrollTop: number }).scrollTop = 0;
      el.dispatchEvent(new Event('scroll'));
    });

    // 200px en 1000ms → 200 px/s < 500 seuil
    act(() => {
      currentTime = 2000;
      (el as HTMLElement & { scrollTop: number }).scrollTop = 200;
      el.dispatchEvent(new Event('scroll'));
    });

    expect(result.current.isScrollingFast).toBe(false);
    expect(result.current.velocity).toBeLessThan(500);
  });

  it('remet velocity à 0 après le délai idleDelay', () => {
    const el = makeFakeEl(0);
    let currentTime = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => currentTime);

    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(el);
      return useScrollVelocity(ref, { threshold: 500, idleDelay: 100 });
    });

    // Initialisation
    act(() => {
      currentTime = 1000;
      (el as HTMLElement & { scrollTop: number }).scrollTop = 0;
      el.dispatchEvent(new Event('scroll'));
    });

    // Scroll rapide
    act(() => {
      currentTime = 2000;
      (el as HTMLElement & { scrollTop: number }).scrollTop = 600;
      el.dispatchEvent(new Event('scroll'));
    });

    expect(result.current.isScrollingFast).toBe(true);

    // Attendre l'expiration du timer idle
    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(result.current.velocity).toBe(0);
    expect(result.current.isScrollingFast).toBe(false);
  });

  it('remet isScrollingFast à false dès que la vélocité redescend sous le seuil', () => {
    const el = makeFakeEl(0);
    let currentTime = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => currentTime);

    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(el);
      return useScrollVelocity(ref, { threshold: 500, idleDelay: 200 });
    });

    // Init
    act(() => {
      currentTime = 1000;
      (el as HTMLElement & { scrollTop: number }).scrollTop = 0;
      el.dispatchEvent(new Event('scroll'));
    });

    // Scroll rapide
    act(() => {
      currentTime = 2000;
      (el as HTMLElement & { scrollTop: number }).scrollTop = 600;
      el.dispatchEvent(new Event('scroll'));
    });
    expect(result.current.isScrollingFast).toBe(true);

    // Scroll lent ensuite (100px en 1000ms = 100 px/s)
    act(() => {
      currentTime = 3000;
      (el as HTMLElement & { scrollTop: number }).scrollTop = 700;
      el.dispatchEvent(new Event('scroll'));
    });
    expect(result.current.isScrollingFast).toBe(false);
  });

  it("nettoie l'event listener et les timers au démontage", () => {
    const el = makeFakeEl(0);
    const addSpy = vi.spyOn(el, 'addEventListener');
    const removeSpy = vi.spyOn(el, 'removeEventListener');

    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(el);
      return useScrollVelocity(ref);
    });

    expect(addSpy).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
  });
});
