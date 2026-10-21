'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { footerNav, nav } from '@/content/site';
import { asset } from '@/lib/asset';

function SgtClock() {
  const [t, setT] = useState('');
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Singapore' });
    const tick = () => setT(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, []);
  return <span className="nav-clock" suppressHydrationWarning><i aria-hidden />SG {t || '--:--'}</span>;
}

/**
 * Floating command bar. Full width of links at the top of the page; folds
 * down to logo, menu and Order once you scroll down, and unfolds again on
 * scroll up or hover. A lit tab slides under whichever link you point at,
 * and the bottom edge fills with page progress.
 */
export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hover, setHover] = useState(false);
  const barRef = useRef<HTMLSpanElement>(null);
  const hlRef = useRef<HTMLSpanElement>(null);
  const linksRef = useRef<HTMLElement>(null);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    let raf = 0;
    let lastY = scrollY;
    let acc = 0;
    let max = 1;
    let folded = false;
    const measure = () => { max = document.documentElement.scrollHeight - innerHeight; };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const y = scrollY;
      if (barRef.current) barRef.current.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
      const dy = y - lastY;
      lastY = y;
      // fold after a deliberate scroll down, unfold on any real scroll up
      acc = Math.sign(dy) === Math.sign(acc) ? acc + dy : dy;
      // only touch React state when the fold actually changes
      const next = y < 120 ? false : acc > 40 ? true : acc < -30 ? false : folded;
      if (next !== folded) { folded = next; setCollapsed(next); }
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Lenis drives the scroll position itself; without stopping it, wheel
    // input kept moving its target behind the menu and the page jumped on close
    const lenis = (window as unknown as { __lenis?: { stop(): void; start(): void } }).__lenis;
    lenis?.stop();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; lenis?.start(); removeEventListener('keydown', onKey); };
  }, [open]);

  const active = (href: string) => (href.startsWith('/#') ? false : pathname.startsWith(href));

  const moveHl = (el: HTMLElement | null) => {
    const hl = hlRef.current;
    if (!hl) return;
    if (!el) { hl.style.opacity = '0'; return; }
    hl.style.opacity = '1';
    hl.style.transform = `translateX(${el.offsetLeft}px)`;
    hl.style.width = `${el.offsetWidth}px`;
  };

  const folded = collapsed && !hover && !open;

  return (
    <>
      <header className="nav" data-folded={folded} data-open={open}>
        <div className="nav-shell" onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}>
          <span className="nav-corners" aria-hidden><i /><i /><i /><i /></span>
          <span className="nav-scan" aria-hidden />

          <Link href="/" className="nav-logo" aria-label="DryLah! home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset('/brand/drylah-lockup.png')} alt="DryLah!" width={1143} height={303} />
          </Link>

          <nav className="nav-links" aria-label="Primary" ref={linksRef} onPointerLeave={() => moveHl(null)}>
            <span className="nav-hl" ref={hlRef} aria-hidden />
            {nav.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                data-active={active(item.href)}
                style={{ ['--i' as string]: i }}
                onPointerEnter={(e) => moveHl(e.currentTarget)}
                onFocus={(e) => moveHl(e.currentTarget)}
                onBlur={() => moveHl(null)}
                tabIndex={folded ? -1 : 0}
              >
                <span className="nav-idx">0{i + 1}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="nav-right">
            <SgtClock />
            <button
              type="button"
              className="nav-toggle"
              aria-expanded={open}
              aria-controls="nav-panel"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((v) => !v)}
            >
              <span className="nav-toggle-ico" aria-hidden><i /><i /><i /><i /></span>
              <span className="nav-toggle-t">{open ? 'Close' : 'Menu'}</span>
            </button>
            <Link href="/order/" className="nav-order" data-magnetic>
              <span className="nav-order-fill" aria-hidden />
              <span className="nav-order-text">Order</span>
              <svg viewBox="0 0 12 12" aria-hidden><path d="M2 10 L10 2 M4 2 H10 V8" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
            </Link>
          </div>

          <span className="nav-bar" ref={barRef} aria-hidden />
        </div>
      </header>

      <div id="nav-panel" className="nav-panel" data-open={open} aria-hidden={!open}>
        <div className="nav-panel-grid" aria-hidden />
        <nav aria-label="Primary, expanded">
          {[{ label: 'Home', href: '/' }, ...footerNav].map((item, i) => (
            <Link key={item.href} href={item.href} style={{ ['--i' as string]: i }} tabIndex={open ? 0 : -1} onClick={() => setOpen(false)}>
              <span className="nav-idx">{String(i).padStart(2, '0')}</span>
              <span className="nav-panel-t">{item.label}</span>
              <svg viewBox="0 0 24 24" aria-hidden><path d="M3 12 H20 M13 5 L20 12 L13 19" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>
            </Link>
          ))}
        </nav>
        <p className="nav-panel-foot"><span className="pip" aria-hidden />Concept under testing</p>
      </div>
    </>
  );
}
