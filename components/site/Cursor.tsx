'use client';

import { useEffect, useRef } from 'react';

/**
 * Cursor system, fine pointers only and off under reduced motion.
 *
 *  - a precise dot that tracks 1:1
 *  - a small ring that trails with weight and grows over anything interactive
 *  - a wide, slow halo that lights the page in brand green
 *  - magnetic pull on [data-magnetic] elements
 */
export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const dot = dotRef.current!, ring = ringRef.current!, halo = haloRef.current!;
    document.documentElement.classList.add('has-cursor');

    let tx = innerWidth / 2, ty = innerHeight / 2;
    let rx = tx, ry = ty, hx = tx, hy = ty;
    let scale = 1, targetScale = 1;
    let raf = 0;
    let magnet: HTMLElement | null = null;
    let shown = false;

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!shown) {
        shown = true;
        rx = hx = tx; ry = hy = ty;
        document.documentElement.dataset.cursor = 'on';
      }
      const el = e.target as Element | null;
      const hot = el?.closest?.('a, button, [role="button"], input, select, textarea, summary, label, [data-cursor]') as HTMLElement | null;
      const big = !!hot?.closest('[data-cursor]');
      ring.dataset.state = big ? 'label' : hot ? 'hot' : 'idle';
      targetScale = big ? 1.9 : hot ? 1.5 : 1;

      const m = el?.closest?.('[data-magnetic]') as HTMLElement | null;
      if (magnet && magnet !== m) { magnet.style.transform = ''; }
      magnet = m;
      if (m) {
        const r = m.getBoundingClientRect();
        const dx = (tx - (r.left + r.width / 2)) * 0.22;
        const dy = (ty - (r.top + r.height / 2)) * 0.3;
        m.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      }
    };
    const onDown = () => { targetScale *= 0.8; };
    const onUp = () => { targetScale /= 0.8; };
    const onLeave = () => { shown = false; document.documentElement.dataset.cursor = 'off'; };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      rx += (tx - rx) * 0.2;
      ry += (ty - ry) * 0.2;
      hx += (tx - hx) * 0.05;
      hy += (ty - hy) * 0.05;
      scale += (targetScale - scale) * 0.18;
      dot.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) scale(${scale})`;
      halo.style.transform = `translate3d(${hx}px, ${hy}px, 0)`;
    };
    raf = requestAnimationFrame(tick);

    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('pointerdown', onDown);
    addEventListener('pointerup', onUp);
    document.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('pointermove', onMove);
      removeEventListener('pointerdown', onDown);
      removeEventListener('pointerup', onUp);
      document.removeEventListener('pointerleave', onLeave);
      document.documentElement.classList.remove('has-cursor');
    };
  }, []);

  return (
    <div className="cursor" aria-hidden>
      <div className="cursor-halo" ref={haloRef} />
      <div className="cursor-ring" ref={ringRef} data-state="idle" />
      <div className="cursor-dot" ref={dotRef} />
    </div>
  );
}
