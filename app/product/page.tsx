import type { Metadata } from 'next';
import Link from 'next/link';

import { Viewer } from '@/components/product/Viewer';
import { Eyebrow, Split, Status } from '@/components/site/ui';
import { components, steps } from '@/content/product';
import { asset } from '@/lib/asset';

export const metadata: Metadata = {
  title: 'Interactive product',
  description: 'Inspect the DryLah base: five numbered parts, three view modes and the evidence status of every component.',
};

export default function ProductPage() {
  return (
    <div className="page">
      <Viewer />

      <div className="wrap">
        <section className="block" aria-labelledby="parts-h">
          <div className="block-head">
            <Eyebrow n="01">The five components</Eyebrow>
            <Split as="h2" text={['Every part,', 'and what we know about it.']} accent={['know']} className="h-lg" />
          </div>
          <ol className="comp-list">
            {components.map((c) => (
              <li key={c.key} className="comp-row" data-reveal>
                <span className="n">{String(c.n).padStart(2, '0')}</span>
                <h3>{c.title}</h3>
                <p>{c.long}</p>
                <Status s={c.status} label={c.statusLabel} />
              </li>
            ))}
          </ol>
        </section>

        <section className="block" aria-labelledby="states-h">
          <div className="block-head">
            <Eyebrow n="02">Three system states</Eyebrow>
            <Split as="h2" text={['Normal use, construction,', 'and the intended water path.']} className="h-lg" />
          </div>
          <div className="grid-3">
            <div className="panel" data-reveal>
              <span className="panel-k">Assembled</span>
              <p>The base sits under the pot you already own. Drainage leaves the pot and goes straight down, not into an open saucer.</p>
            </div>
            <div className="panel" data-reveal>
              <span className="panel-k">Exploded</span>
              <p>Five parts stack vertically: platform, mesh, mineral storage, wick and the reservoir with its screened overflow.</p>
            </div>
            <div className="panel" data-reveal>
              <span className="panel-k">Water flow</span>
              <p>{steps.map((s) => s.label).join(', ')}. The last three still need bench testing.</p>
            </div>
          </div>
        </section>

        <section className="block" aria-labelledby="proto-h">
          <div className="block-head">
            <Eyebrow n="03">From sketch to prototype</Eyebrow>
            <Split as="h2" text={['Drawn, then built', 'on a real balcony.']} accent={['built']} className="h-lg" />
          </div>
          <div className="photo-pair">
            <figure className="photo" data-reveal style={{ ['--i' as string]: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset('/img/prototype-balcony.webp')} alt="Physical DryLah prototype under a pothos in a terracotta pot, on a Singapore balcony with tower blocks behind." loading="lazy" />
              <figcaption><Status s="demonstrated" /><span>Physical prototype</span></figcaption>
            </figure>
            <figure className="photo" data-reveal style={{ ['--i' as string]: 1 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset('/img/concept-drawing.webp')} alt="Coloured exploded concept drawing with five numbered parts." loading="lazy" />
              <figcaption><Status s="concept" /><span>Concept drawing</span></figcaption>
            </figure>
          </div>
          <figure className="photo" data-reveal style={{ marginTop: 'clamp(10px, 1.4vw, 20px)', maxWidth: 720 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset('/img/pencil-sketch.webp')} alt="Early pencil sketch of the layered base." loading="lazy" style={{ filter: 'invert(0.92) hue-rotate(180deg) contrast(0.9)' }} />
            <figcaption><span>Early pencil sketch</span></figcaption>
          </figure>
        </section>

        <section className="block" aria-labelledby="fit-h">
          <div className="grid-2">
            <div className="panel" data-reveal>
              <span className="panel-k">Compatibility</span>
              <p>The design goal is to keep the pot you already own. Final compatibility and size coverage still need fit testing, and interviewees asked for a flatter, smaller version.</p>
            </div>
            <div className="limits" data-reveal>
              <span className="panel-k">Caveats</span>
              <p>The prototype demonstrated assembly, pot support and contained drainage. It did not demonstrate mosquito exclusion, reliable capillary return, long-term plant health, safe overflow, durability, cleanability or final cost. <Link className="text-link" href="/research/testing/">Testing plan</Link></p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
