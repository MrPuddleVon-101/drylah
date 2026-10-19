'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * One observer for the whole site. Anything with [data-reveal] gets
 * data-in="true" when it enters the viewport; CSS decides what that means
 * (mask rise, clip wipe, rule draw, counter). Children can stagger with
 * --i. Without JS, or under reduced motion, everything is simply visible.
 */
export function Reveals() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.dataset.motion = 'reduced';
      document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => (el.dataset.in = 'true'));
      return;
    }
    root.dataset.motion = 'full';

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          el.dataset.in = 'true';
          el.dispatchEvent(new CustomEvent('reveal'));
          io.unobserve(el);
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.01 },
    );

    const scan = () => document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-in="true"])').forEach((el) => io.observe(el));
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, [pathname]);

  return null;
}
