import type { Metadata } from 'next';

import { Faq } from '@/components/home/Sections';
import { Team } from '@/components/home/Team';
import { PageHead } from '@/components/site/PageHead';
import { Eyebrow, Split, Status } from '@/components/site/ui';

export const metadata: Metadata = {
  title: 'Team',
  description: 'Four teammates in Singapore. One shared record of what works and what fails.',
};

export default function TeamPage() {
  return (
    <div className="page">
      <PageHead
        crumbs={[{ label: 'Team' }]}
        eyebrow="The people responsible"
        title={['Four teammates.', 'One shared record.']}
        accent={['record.']}
        lede="A student team in Singapore. Each of us owns a part of the evidence, and every claim on this site traces back to one of us."
      />
      <Team heading={false} />
      <div className="wrap">
        <section className="block" style={{ paddingTop: 0 }}>
          <div className="block-head">
            <Eyebrow n="02">Shared evidence standard</Eyebrow>
            <Split as="h2" text={['What we promise', 'each other.']} className="h-lg" />
          </div>
          <div className="grid-3">
            <div className="panel" data-reveal>
              <Status s="demonstrated" size="lg" />
              <p style={{ marginTop: 14, color: 'var(--bone-80)' }}>Only what the physical prototype directly showed, under conditions we can describe.</p>
            </div>
            <div className="panel" data-reveal>
              <Status s="proposed" size="lg" />
              <p style={{ marginTop: 14, color: 'var(--bone-80)' }}>Anything in the design that has not been shown yet. Labelled every time it appears.</p>
            </div>
            <div className="panel" data-reveal>
              <Status s="validate" size="lg" />
              <p style={{ marginTop: 14, color: 'var(--bone-80)' }}>Questions whose answers could change the design, the price or whether we continue at all.</p>
            </div>
          </div>
        </section>
      </div>
      <Faq />
    </div>
  );
}
