'use client';

import { useEffect } from 'react';
import type Lenis from 'lenis';

/**
 * Weighted scrolling. The product story is driven by scroll position, so the scroll
 * itself needs inertia - otherwise the camera snaps and the whole thing reads
 * as a slideshow rather than a move through space.
 *
 * Keyboard navigation is routed through Lenis rather than left to the browser.
 * Native key scrolling moves the page directly, and Lenis then animates back
 * toward its own target on the next frame, which reads as the page jumping
 * backwards into the previous scene.
 *
 * Skipped entirely under prefers-reduced-motion, where native scrolling is the
 * correct behaviour.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    let lenis: Lenis | null = null;
    let cancelled = false;
    let onKey: ((e: KeyboardEvent) => void) | null = null;

    import('lenis').then(({ default: LenisCtor }) => {
      if (cancelled) return;

      const instance = new LenisCtor({
        // Exponential follow rather than a fixed duration. A long duration
        // reads as lag, not as weight; the length of the journey comes from
        // the length of the sections instead.
        lerp: 0.09,
        wheelMultiplier: 0.9,
        touchMultiplier: 1.4,
        syncTouch: false,
        anchors: { offset: -72 },
      });
      lenis = instance;

      const loop = (time: number) => {
        instance.raf(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);

      const isTypingTarget = (el: EventTarget | null) => {
        const node = el as HTMLElement | null;
        if (!node || !node.tagName) return false;
        return (
          node.isContentEditable ||
          node.tagName === 'INPUT' ||
          node.tagName === 'TEXTAREA' ||
          node.tagName === 'SELECT'
        );
      };

      onKey = (e: KeyboardEvent) => {
        // Leave the browser alone for shortcuts, typing, and anything another
        // handler has already claimed.
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
        if (isTypingTarget(e.target)) return;
        // The mobile menu locks the page; do not scroll behind it.
        if (document.body.style.overflow === 'hidden') return;

        const page = window.innerHeight * 0.88;
        let to: number | null = null;

        switch (e.key) {
          case 'PageDown':   to = instance.targetScroll + page; break;
          case 'PageUp':     to = instance.targetScroll - page; break;
          case ' ':          to = instance.targetScroll + (e.shiftKey ? -page : page); break;
          case 'ArrowDown':  to = instance.targetScroll + 140; break;
          case 'ArrowUp':    to = instance.targetScroll - 140; break;
          case 'Home':       to = 0; break;
          case 'End':        to = instance.limit; break;
          default: return;
        }

        e.preventDefault();
        instance.scrollTo(Math.max(0, Math.min(instance.limit, to)), {
          duration: e.key === 'Home' || e.key === 'End' ? 1.2 : 0.7,
          // A locked scroll cannot be interrupted and then fought over.
          lock: true,
        });
      };

      window.addEventListener('keydown', onKey);

      // Nav and in-page links use this to glide to anchors.
      (window as unknown as Record<string, unknown>).__lenis = instance;
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (onKey) window.removeEventListener('keydown', onKey);
      lenis?.destroy();
    };
  }, []);

  return null;
}
