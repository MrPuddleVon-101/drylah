'use client';

import Link from 'next/link';
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import { sourceById } from '@/content/sources';
import type { Evidence } from '@/lib/types';

/* ------------------------------------------------------------------ status */

const STATUS: Record<Evidence, string> = {
  demonstrated: 'Demonstrated',
  proposed: 'In the design',
  validate: 'Must validate',
  public: 'Public evidence',
  project: 'Project research',
  concept: 'Concept illustration',
};

/** Evidence badge: colour + glyph + words, never colour alone (PRD 14). */
export function Status({ s, label, size = 'sm' }: { s: Evidence; label?: string; size?: 'sm' | 'lg' }) {
  return (
    <span className="status" data-s={s} data-size={size}>
      <StatusGlyph s={s} />
      <span>{label ?? STATUS[s]}</span>
    </span>
  );
}

export function StatusGlyph({ s }: { s: Evidence }) {
  return (
    <svg className="status-glyph" viewBox="0 0 12 12" aria-hidden>
      {s === 'demonstrated' && <rect x="1.5" y="1.5" width="9" height="9" fill="currentColor" />}
      {s === 'proposed' && (
        <>
          <rect x="1.5" y="1.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <path d="M1.5 10.5 L10.5 1.5 L10.5 10.5 Z" fill="currentColor" />
        </>
      )}
      {s === 'validate' && <rect x="1.5" y="1.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1.3" strokeDasharray="2 1.6" />}
      {s === 'concept' && <circle cx="6" cy="6" r="4.3" fill="none" stroke="currentColor" strokeWidth="1.3" />}
      {(s === 'public' || s === 'project') && <path d="M6 1.2 L10.8 6 L6 10.8 L1.2 6 Z" fill="currentColor" />}
    </svg>
  );
}

/* ----------------------------------------------------------------- source */

export function SourceTag({ id, note }: { id: string; note?: string }) {
  const s = sourceById(id);
  if (!s) return null;
  return (
    <a className="source-tag" href={s.url} target="_blank" rel="noreferrer" data-cursor="Source">
      <span className="source-tag-k">Source</span>
      <span>{s.publisher}{note ? `, ${note}` : ''}</span>
      <svg viewBox="0 0 10 10" aria-hidden><path d="M2 8 L8 2 M3.5 2 H8 V6.5" fill="none" stroke="currentColor" strokeWidth="1.1" /></svg>
    </a>
  );
}

/* ---------------------------------------------------------------- buttons */

export function Btn({
  href, children, variant = 'primary', cursor, onClick, external,
}: {
  href?: string;
  children: ReactNode;
  variant?: 'primary' | 'ghost' | 'line';
  cursor?: string;
  onClick?: () => void;
  external?: boolean;
}) {
  const inner = (
    <>
      <span className="btn-fill" aria-hidden />
      <span className="btn-text" data-text={typeof children === 'string' ? children : undefined}>{children}</span>
      <svg className="btn-arrow" viewBox="0 0 14 14" aria-hidden><path d="M1 7 H12 M7.5 2.5 L12 7 L7.5 11.5" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
    </>
  );
  if (href) {
    if (external) return <a className="btn" data-v={variant} href={href} target="_blank" rel="noreferrer" data-magnetic data-cursor={cursor}>{inner}</a>;
    return <Link className="btn" data-v={variant} href={href} onClick={onClick} data-magnetic data-cursor={cursor}>{inner}</Link>;
  }
  return <button type="button" className="btn" data-v={variant} onClick={onClick} data-magnetic data-cursor={cursor}>{inner}</button>;
}

/* ---------------------------------------------------------- split heading */

/**
 * Headline whose words rise out of a mask, one after another. Rendered on the
 * server as plain words so it reads without JS; the motion is CSS only.
 */
export function Split({ text, as: Tag = 'h2', className, accent, delay = 0 }: {
  text: string | string[];
  as?: 'h1' | 'h2' | 'h3' | 'p';
  className?: string;
  /** Words to colour in the accent, matched exactly. */
  accent?: string[];
  delay?: number;
}) {
  const lines = Array.isArray(text) ? text : [text];
  let i = 0;
  return (
    <Tag className={`split ${className ?? ''}`} data-reveal style={{ ['--d' as string]: `${delay}ms` }}>
      {lines.map((line, li) => (
        <span className="split-line" key={li}>
          {line.split(' ').map((w, wi) => {
            const idx = i++;
            return (
              <Fragment key={wi}>
                <span className="split-mask">
                  <span className={`split-word${accent?.includes(w) ? ' is-accent' : ''}`} style={{ ['--i' as string]: idx }}>{w}</span>
                </span>
                {wi < line.split(' ').length - 1 ? ' ' : ''}
              </Fragment>
            );
          })}
        </span>
      ))}
    </Tag>
  );
}

/* ---------------------------------------------------------------- counter */

export function Counter({ to, prefix = '', suffix = '', duration = 1600 }: { to: number; prefix?: string; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(to);
  // layout effect: the reset to 0 lands before the browser paints, so the
  // final number never flashes before the count-up
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setVal(0);
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / duration);
        const eased = 1 - Math.pow(1 - t, 4);
        setVal(Math.round(to * eased));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to, duration]);
  return <span ref={ref} className="counter">{prefix}{val.toLocaleString('en-SG')}{suffix}</span>;
}

/* ----------------------------------------------------------- section head */

export function Eyebrow({ n, children }: { n?: string; children: ReactNode }) {
  return (
    <p className="eyebrow" data-reveal>
      {n && <span className="eyebrow-n">{n}</span>}
      <span className="eyebrow-rule" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

/** Corner ticks, like a CAD viewport frame. */
export function Ticks() {
  return (
    <span className="ticks" aria-hidden>
      <i /><i /><i /><i />
    </span>
  );
}

export function track(event: string, data?: Record<string, string | number>) {
  // Lightweight analytics hook (FR-13). Never pass names, emails or free text.
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer?.push({ event, ...data });
}
