'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useLayoutEffect } from 'react';
import type Lenis from 'lenis';

type LenisLike = { scrollTo(y: number, o?: object): void; resize(): void };
const getLenis = () => (window as unknown as { __lenis?: LenisLike }).__lenis;

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
  const pathname = usePathname();

  /*
   * Route changes. Lenis keeps easing toward its last target, so a link
   * clicked while the page was still coasting used to open the next page
   * part-way down (or at the bottom), overriding the router's scroll to top
   * or its back/forward restoration. On every route commit the pending glide
   * is cancelled before the router positions the page, and Lenis re-measures
   * the new document and adopts whatever position the router chose.
   */
  useLayoutEffect(() => {
    const lenis = getLenis();
    if (!lenis) return;
    lenis.scrollTo(window.scrollY, { immediate: true, force: true });
    const id = requestAnimationFrame(() => {
      lenis.resize();
      lenis.scrollTo(window.scrollY, { immediate: true, force: true });
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);

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
        // slower, weightier scroll across the whole page, matching the pace
        // of the 3D story section
        lerp: 0.075,
        wheelMultiplier: 0.55,
        touchMultiplier: 0.9,
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

        const page = window.innerHeight * 0.6;
        let to: number | null = null;

        switch (e.key) {
          case 'PageDown':   to = instance.targetScroll + page; break;
          case 'PageUp':     to = instance.targetScroll - page; break;
          case ' ':          to = instance.targetScroll + (e.shiftKey ? -page : page); break;
          case 'ArrowDown':  to = instance.targetScroll + 90; break;
          case 'ArrowUp':    to = instance.targetScroll - 90; break;
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
