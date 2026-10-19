'use client';

import { useRef } from 'react';

import { team } from '@/content/site';
import { asset } from '@/lib/asset';

/**
 * Four portraits under stage light. Each card tilts toward the pointer and
 * its light column brightens on hover. Portraits were cut out and graded to
 * one exposure and one tone so four different photos read as a set.
 */
export function Team({ heading = true }: { heading?: boolean }) {
  return (
    <section className="team" id="team" aria-labelledby="team-h">
      {heading && (
        <div className="team-head">
          <p className="eyebrow" data-reveal><span className="eyebrow-n">04</span><span className="eyebrow-rule" aria-hidden /><span>Meet the team</span></p>
          <h2 id="team-h" className="team-title" data-reveal>
            Four teammates.<br /><span>One shared record of what works and what fails.</span>
          </h2>
        </div>
      )}
      <ul className="team-row">
        {team.map((m, i) => <Card key={m.slug} m={m} i={i} />)}
      </ul>
    </section>
  );
}

function Card({ m, i }: { m: (typeof team)[number]; i: number }) {
  const ref = useRef<HTMLLIElement>(null);
  const [first, ...rest] = m.name.split(' ');
  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--rx', `${-y * 7}deg`);
    el.style.setProperty('--ry', `${x * 9}deg`);
    el.style.setProperty('--mx', `${(x + 0.5) * 100}%`);
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };
  return (
    <li className="member" ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} data-reveal style={{ ['--i' as string]: i }}>
      {(() => {
        const inner = (
          <>
            <div className="member-beam" aria-hidden />
            <div className="member-floor" aria-hidden />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="member-img" src={asset(m.portrait)} alt={`Portrait of ${m.name}`} width={900} height={1125} loading="lazy" />
            <span className="member-idx" aria-hidden>0{i + 1}</span>
            {m.linkedin && <span className="member-in" aria-hidden>in</span>}
          </>
        );
        return m.linkedin ? (
          <a className="member-card" href={m.linkedin} target="_blank" rel="noreferrer" aria-label={`${m.name} on LinkedIn`} data-cursor="LinkedIn">{inner}</a>
        ) : (
          <div className="member-card">{inner}</div>
        );
      })()}
      <div className="member-meta">
        <h3 className="member-name"><span>{first}</span> <span>{rest.join(' ')}</span></h3>
        <p className="member-role">{m.role}</p>
      </div>
    </li>
  );
}
