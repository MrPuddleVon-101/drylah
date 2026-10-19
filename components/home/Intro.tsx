'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Title card. The wordmark rises letter by letter, the brush stroke from the
 * logo draws under it, then the whole card is swept off upward and the model
 * rises into the space behind it. Plays on every page load; skipped under
 * reduced motion.
 */
// Module scope survives client-side navigation but resets on refresh.
let playedThisLoad = false;

export function Intro({ ready, onWipe }: { ready: boolean; onWipe: () => void }) {
  // Rendered in the server HTML so the card covers the page from the first paint.
  const [phase, setPhase] = useState<'in' | 'out' | 'done'>(() => (playedThisLoad ? 'done' : 'in'));
  const [pct, setPct] = useState(0);
  const minDone = useRef(false);
  const readyRef = useRef(ready);
  const wiped = useRef(false);
  readyRef.current = ready;

  const lock = (on: boolean) => {
    const lenis = (window as unknown as { __lenis?: { stop(): void; start(): void } }).__lenis;
    document.documentElement.style.overflow = on ? 'hidden' : '';
    if (on) lenis?.stop(); else lenis?.start();
  };

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || playedThisLoad) {
      setPhase('done');
      onWipe();
      return;
    }
    window.scrollTo(0, 0);
    setPhase('in');
    lock(true);
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - t0) / 1900));
      const cap = readyRef.current ? 100 : 86;
      setPct(Math.round(Math.min(cap, 100 * (1 - Math.pow(1 - t, 3)))));
      if (t >= 1) minDone.current = true;
      if (minDone.current && readyRef.current) { wipe(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // never hold the visitor hostage if WebGL is slow or missing
    const bail = setTimeout(() => wipe(), 5200);

    function wipe() {
      if (wiped.current) return;
      wiped.current = true;
      cancelAnimationFrame(raf);
      clearTimeout(bail);
      setPct(100);
      setPhase('out');
      onWipe();
      playedThisLoad = true;
      setTimeout(() => { setPhase('done'); lock(false); }, 1250);
    }
    return () => { cancelAnimationFrame(raf); clearTimeout(bail); lock(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === 'done') return null;

  const word = ['D', 'r', 'y', 'L', 'a', 'h', '!'];
  return (
    <div className="intro" data-phase={phase} aria-hidden>
      <div className="intro-grid" />
      <div className="intro-word">
        {word.map((c, i) => (
          <span className="intro-mask" key={i}>
            <span className={`intro-char${i >= 3 ? ' g' : ''}`} style={{ ['--i' as string]: i }}>{c}</span>
          </span>
        ))}
        <svg className="intro-brush" viewBox="0 0 600 40" preserveAspectRatio="none">
          <path d="M6 26 C 120 14, 260 12, 380 16 S 560 22, 594 14" />
        </svg>
      </div>
      <div className="intro-meta">
        <span>Plant can drink. Mozzie cannot.</span>
        <span className="intro-pct">{String(pct).padStart(3, '0')}</span>
      </div>
      <div className="intro-meta intro-meta-top">
        <span>Singapore</span>
        <span>Concept under testing</span>
      </div>
      <span className="intro-edge" />
    </div>
  );
}
