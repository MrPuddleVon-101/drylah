'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { comparison, evidenceColumns } from '@/content/product';
import { interviews, problemStats } from '@/content/research';
import { faq } from '@/content/site';
import { Btn, Counter, Eyebrow, SourceTag, Split, Status, StatusGlyph, Ticks, track } from '@/components/site/ui';
import { asset } from '@/lib/asset';

/* --------------------------------------------------------------- marquee */

/** Kinetic band. Drifts on its own and leans into the scroll direction. */
export function Marquee({ items }: { items: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let x = 0, v = 0, lastY = scrollY, raf = 0, w = 1;
    const measure = () => { if (ref.current) w = ref.current.scrollWidth / 2; };
    measure();
    const ro = new ResizeObserver(measure);
    if (ref.current) ro.observe(ref.current);
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dy = scrollY - lastY;
      lastY = scrollY;
      v += (dy * 0.15 - v) * 0.08;
      x -= 0.6 + Math.abs(v) * 1.2 * Math.sign(v || 1);
      const el = ref.current;
      if (!el) return;
      if (x <= -w) x += w;
      if (x > 0) x -= w;
      el.style.transform = `translate3d(${x}px,0,0) skewX(${Math.max(-8, Math.min(8, -v * 0.6))}deg)`;
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);
  const row = (k: string) => (
    <div className="marquee-row" key={k} aria-hidden={k === 'b'}>
      {items.map((t, i) => (
        <span key={i} className="marquee-item">
          {t}
          <svg viewBox="0 0 20 20" aria-hidden><path d="M10 1 C10 7 13 10 19 10 C13 10 10 13 10 19 C10 13 7 10 1 10 C7 10 10 7 10 1Z" /></svg>
        </span>
      ))}
    </div>
  );
  return (
    <div className="marquee">
      <div className="marquee-track" ref={ref}>{row('a')}{row('b')}</div>
    </div>
  );
}

/* --------------------------------------------------------------- problem */

export function Problem() {
  return (
    <section className="sec problem" id="problem" aria-labelledby="problem-h">
      <div className="problem-head">
        <Eyebrow n="05">The overlooked space</Eyebrow>
        <Split as="h2" text={['The pot is watered.', 'The plate is forgotten.']} accent={['forgotten.']} className="h-xl" />
      </div>
      <ol className="stats">
        {problemStats.map((s, i) => (
          <li className="stat" key={s.value} data-reveal style={{ ['--i' as string]: i }}>
            <Ticks />
            <span className="stat-n">{String(i + 1).padStart(2, '0')}</span>
            <p className="stat-v">
              {s.count !== undefined ? <Counter to={s.count} prefix={s.prefix} suffix={s.suffix} /> : s.value}
            </p>
            <p className="stat-l">{s.label}</p>
            <p className="stat-q">{s.qualifier}</p>
            <SourceTag id={s.sourceId} />
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ------------------------------------------------------------- interviews */

export function Interviews() {
  return (
    <section className="sec interviews" id="listening" aria-labelledby="int-h">
      <div className="int-head">
        <Eyebrow n="06">What 12 interviews changed</Eyebrow>
        <Split as="h2" text={['We did not start with a perfect product.', 'We started by listening.']} accent={['listening.']} className="h-lg" />
      </div>
      <ol className="int-list">
        {interviews.map((x, i) => (
          <li className="int" key={x.theme} data-reveal style={{ ['--i' as string]: i }}>
            <div className="int-top">
              <span className="int-n">0{i + 1}</span>
              <span className="int-theme">{x.theme}</span>
            </div>
            <blockquote className="int-quote"><p>{x.quote}</p></blockquote>
            <div className="int-arrow" aria-hidden>
              <svg viewBox="0 0 200 24" preserveAspectRatio="none"><path d="M0 12 H192 M184 4 L194 12 L184 20" /></svg>
            </div>
            <p className="int-k">Design response</p>
            <p className="int-r">{x.response}</p>
          </li>
        ))}
      </ol>
      <div className="int-foot" data-reveal>
        <Status s="project" label="12 interviews. Not proof of demand." />
        <Link href="/research/household-behaviour/" className="text-link">Interview notes</Link>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- evidence */

export function EvidenceStates() {
  return (
    <section className="sec evidence" id="evidence" aria-labelledby="ev-h">
      <div className="ev-head">
        <Eyebrow n="07">Evidence states</Eyebrow>
        <Split as="h2" text={['What we have shown.', 'What we still have to prove.']} accent={['prove.']} className="h-lg" />
      </div>
      <div className="ev-cols">
        {evidenceColumns.map((col, ci) => (
          <article className="ev-col" key={col.status} data-s={col.status} data-reveal style={{ ['--i' as string]: ci }}>
            <header>
              <span className="ev-glyph"><StatusGlyph s={col.status} /></span>
              <h3>{col.title}</h3>
              <span className="ev-count">{String(col.items.length).padStart(2, '0')}</span>
            </header>
            {col.status === 'demonstrated' && (
              <figure className="ev-photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset('/img/prototype-closeup.webp')} alt="Physical prototype: a clear tray of pebbles under a perforated platform, supporting a terracotta pot on a balcony." loading="lazy" />
                <figcaption>Physical prototype, Singapore balcony</figcaption>
              </figure>
            )}
            {col.status === 'proposed' && (
              <figure className="ev-photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset('/img/concept-drawing.webp')} alt="Concept drawing of the mesh, wick and screened overflow." loading="lazy" style={{ objectPosition: '50% 60%' }} />
                <figcaption>Concept drawing, not yet tested</figcaption>
              </figure>
            )}
            {col.status === 'validate' && (
              <div className="ev-photo ev-pending" aria-label="None of the five open questions has been tested yet.">
                <p className="ev-pending-n">0<span>/5</span></p>
                <p className="ev-pending-l">open questions tested so far</p>
                <span className="ev-pending-scan" aria-hidden />
              </div>
            )}
            <ul>
              {col.items.map((it, i) => (
                <li key={it} style={{ ['--j' as string]: i }}><StatusGlyph s={col.status} />{it}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- comparison */

const CELL: Record<string, { label: string; cls: string }> = {
  yes: { label: 'Yes', cls: 'yes' },
  no: { label: 'No', cls: 'no' },
  partial: { label: 'Partly', cls: 'partial' },
  na: { label: 'Not applicable', cls: 'na' },
  proposed: { label: 'By design', cls: 'proposed' },
  validate: { label: 'Must validate', cls: 'validate' },
};

export function Comparison() {
  return (
    <section className="sec compare" id="compare" aria-labelledby="cmp-h">
      <div className="cmp-head">
        <Eyebrow n="08">Comparison</Eyebrow>
        <Split as="h2" text={['A wick or lid alone is not new.', 'The whole base has to earn its place.']} accent={['earn']} className="h-lg" />
      </div>
      <div className="cmp-scroll" data-reveal>
        <table className="cmp">
          <thead>
            <tr>
              <th scope="col"><span className="sr-only">Feature</span></th>
              {comparison.options.map((o, i) => (
                <th scope="col" key={o} data-us={i === comparison.options.length - 1}>{o}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map((r, ri) => (
              <tr key={r.feature} style={{ ['--r' as string]: ri }}>
                <th scope="row">{r.feature}</th>
                {r.values.map((v, i) => (
                  <td key={i} data-us={i === r.values.length - 1}>
                    <span className={`cell cell-${CELL[v].cls}`} title={CELL[v].label}>
                      <i aria-hidden />
                      <span className="cell-l">{CELL[v].label}</span>
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="cmp-note" data-reveal>{comparison.note} <Link className="text-link" href="/research/alternatives/">See the alternatives</Link></p>
    </section>
  );
}

/* -------------------------------------------------------------------- FAQ */

export function Faq() {
  const [open, setOpen] = useState<number>(0);
  return (
    <section className="sec faq" id="faq" aria-labelledby="faq-h">
      <div className="faq-head">
        <Eyebrow n="08">Straight answers</Eyebrow>
        <Split as="h2" text={['No hype.', 'Here is what we know.']} accent={['know.']} className="h-lg" />
      </div>
      <ul className="faq-list">
        {faq.map((f, i) => (
          <li key={f.q} className="faq-item" data-open={open === i} data-reveal style={{ ['--i' as string]: i }}>
            <button type="button" aria-expanded={open === i} aria-controls={`faq-${i}`} onClick={() => setOpen(open === i ? -1 : i)}>
              <span className="faq-n">{String(i + 1).padStart(2, '0')}</span>
              <span className="faq-q">{f.q}</span>
              <span className="faq-plus" aria-hidden><i /><i /></span>
            </button>
            <div className="faq-a" id={`faq-${i}`} role="region">
              <div><p>{f.a}</p></div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* -------------------------------------------------------------------- CTA */

export function FinalCta() {
  return (
    <section className="cta" aria-labelledby="cta-h">
      <div className="cta-inner">
        <p className="cta-k" data-reveal>Pilot programme, Singapore</p>
        <Split as="h2" text={['Help us test it', 'properly.']} accent={['properly.']} className="h-xxl" />
        <div className="cta-row" data-reveal>
          <Btn href="/order/?type=pilot" onClick={() => track('order_started', { from: 'cta_pilot' })}>Join the pilot</Btn>
          <Btn href="/order/?type=order" variant="ghost" onClick={() => track('order_started', { from: 'cta_order' })}>Register order interest</Btn>
          <Btn href="/order/?type=testing" variant="line" onClick={() => track('partner_interest_selected', { type: 'testing' })}>Offer testing support</Btn>
        </div>
        <p className="cta-note" data-reveal><Status s="validate" label="No payment taken" /> Target price S$4.90</p>
      </div>
    </section>
  );
}
