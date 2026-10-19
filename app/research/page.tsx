import type { Metadata } from 'next';
import Link from 'next/link';

import { CardViz } from '@/components/research/Viz';
import { PageHead } from '@/components/site/PageHead';
import { Eyebrow, Split, Status } from '@/components/site/ui';
import { researchCards } from '@/content/research';
import { sources } from '@/content/sources';

export const metadata: Metadata = {
  title: 'Research',
  description: 'The public evidence, what we heard from users, what the prototype showed and what still needs to be tested.',
};

export default function ResearchHub() {
  return (
    <div className="page">
      <PageHead
        crumbs={[{ label: 'Research' }]}
        eyebrow="Research hub"
        title={['The idea is simple.', 'The evidence is not.']}
        accent={['not.']}
        lede="DryLah! focuses on one household task inside a much larger dengue-control system. Explore the public evidence, what we heard from users, what the prototype showed and what still needs to be tested."
      />
      <div className="wrap">
        <ul className="r-cards">
          {researchCards.map((c, i) => (
            <li key={c.slug} className="r-card" data-reveal style={{ ['--i' as string]: i }}>
              <CardViz kind={c.slug} />
              <div className="r-card-top"><span>{c.n}</span><span>{c.title}</span></div>
              <p className="r-card-stat">{c.stat}</p>
              <p className="r-card-sl">{c.statLabel}</p>
              <h3><Link href={`/research/${c.slug}/`} style={{ position: 'static' }} data-cursor="Read">
                <span style={{ position: 'absolute', inset: 0 }} aria-hidden />{c.title}
              </Link></h3>
              <p>{c.teaser}</p>
              <span className="r-card-go" aria-hidden>
                <svg viewBox="0 0 14 14"><path d="M1 7 H12 M7.5 2.5 L12 7 L7.5 11.5" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
              </span>
            </li>
          ))}
        </ul>

        <section className="block" aria-labelledby="method-h">
          <div className="block-head">
            <Eyebrow n="06">Methodology</Eyebrow>
            <Split as="h2" text={['Every claim', 'carries a label.']} accent={['label.']} className="h-lg" />
            <p data-reveal>Public figures set context. Project research is what we collected ourselves. Product claims are marked by how far the prototype has actually gone.</p>
          </div>
          <div className="grid-3">
            {[
              { s: 'public' as const, t: 'Supported by a linked external source.' },
              { s: 'project' as const, t: 'Collected by the team, such as the 12 interviews.' },
              { s: 'demonstrated' as const, t: 'Directly shown by the current physical prototype.' },
              { s: 'proposed' as const, t: 'Part of the design but not yet demonstrated.' },
              { s: 'validate' as const, t: 'An answer that could change the design, price, launch or decision to continue.' },
              { s: 'concept' as const, t: 'A drawing or animation explaining intent.' },
            ].map((x) => (
              <div className="panel" key={x.s} data-reveal>
                <Status s={x.s} size="lg" />
                <p style={{ marginTop: 14, color: 'var(--bone-80)' }}>{x.t}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="block" aria-labelledby="idx-h">
          <div className="block-head">
            <Eyebrow n="07">Source index</Eyebrow>
            <Split as="h2" text={['Where the numbers', 'come from.']} className="h-lg" />
            <p data-reveal>Public figures establish context. They do not prove DryLah performance, demand or causal impact. <Link href="/sources/" className="text-link">Full source library</Link></p>
          </div>
          <ol className="src-list">
            {sources.slice(0, 5).map((s, i) => (
              <li key={s.id} className="src" data-reveal>
                <span className="src-n">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <a href={s.url} target="_blank" rel="noreferrer" className="src-t" data-cursor="Open">{s.title}</a>
                  <p className="src-p">{s.publisher}, {s.date}</p>
                </div>
                <p className="src-u">{s.usage}</p>
                <p className="src-a">Accessed {s.accessed}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
