import type { Metadata } from 'next';

import { PageHead } from '@/components/site/PageHead';
import { Eyebrow, Split, Status } from '@/components/site/ui';
import { internalMaterial, sources } from '@/content/sources';

export const metadata: Metadata = {
  title: 'Sources',
  description: 'Every public source behind the DryLah! website, with accessed dates and how each one is used.',
};

export default function SourcesPage() {
  return (
    <div className="page">
      <PageHead
        crumbs={[{ label: 'Sources' }]}
        eyebrow="Source library"
        title={['Every number,', 'traced.']}
        accent={['traced.']}
        lede="Public figures are included to establish context. They do not prove DryLah performance, demand or causal impact. Prices and live web content may change and should be rechecked before public launch."
      />
      <div className="wrap">
        <ol className="src-list">
          {sources.map((s, i) => (
            <li key={s.id} id={s.id} className="src" data-reveal>
              <span className="src-n">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <a href={s.url} target="_blank" rel="noreferrer" className="src-t" data-cursor="Open">{s.title}</a>
                <p className="src-p">{s.publisher}, {s.date}</p>
                <div style={{ marginTop: 10 }}><Status s="public" /></div>
              </div>
              <p className="src-u">{s.usage}</p>
              <p className="src-a">Accessed {s.accessed}</p>
            </li>
          ))}
        </ol>

        <section className="block">
          <div className="block-head">
            <Eyebrow n="02">Internal project material</Eyebrow>
            <Split as="h2" text={['What we made', 'ourselves.']} className="h-lg" />
          </div>
          <ul className="src-list">
            {internalMaterial.map((m, i) => (
              <li key={m} className="src" data-reveal style={{ gridTemplateColumns: '40px 1fr auto' }}>
                <span className="src-n">{String(i + 1).padStart(2, '0')}</span>
                <p className="src-t">{m}</p>
                <Status s="project" />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
