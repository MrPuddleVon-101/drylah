import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Alternatives, HouseholdBehaviour, Mechanism, SingaporeContext, Testing } from '@/components/research/Pages';
import { PageHead } from '@/components/site/PageHead';
import { researchCards } from '@/content/research';

const PAGES: Record<string, { title: string[]; accent?: string[]; lede: string; Body: () => React.ReactNode }> = {
  'singapore-dengue': {
    title: ['Singapore context.', 'Cases, habitats, plates.'],
    accent: ['plates.'],
    lede: 'Where dengue breeding is found in Singapore, where flowerpot plates rank, and why these numbers cannot be stacked into one claim.',
    Body: SingaporeContext,
  },
  'household-behaviour': {
    title: ['Twelve conversations.', 'Three decisions that changed the product.'],
    accent: ['changed'],
    lede: 'Customer validation here means the learning process. It informed the design direction. It is not proof that anyone will buy.',
    Body: HouseholdBehaviour,
  },
  mechanism: {
    title: ['Mosquito biology.', 'And what a barrier must do.'],
    accent: ['barrier'],
    lede: 'Why emptying water is not the same as removing eggs, and the four points where a covered base would have to hold.',
    Body: Mechanism,
  },
  alternatives: {
    title: ['A wick or lid alone', 'is not new.'],
    accent: ['new.'],
    lede: 'An honest comparison of the free option, NEA-recommended plate care, wick trays, self-watering inserts and the DryLah base.',
    Body: Alternatives,
  },
  testing: {
    title: ['Testing roadmap.', 'Make failure useful.'],
    accent: ['useful.'],
    lede: 'Five validation areas, a six-week plan with exact gates, and the results that would make us redesign or pivot.',
    Body: Testing,
  },
};

export function generateStaticParams() {
  return Object.keys(PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const card = researchCards.find((c) => c.slug === slug);
  return { title: card ? `${card.title} | Research` : 'Research', description: PAGES[slug]?.lede };
}

export default async function ResearchPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = PAGES[slug];
  if (!page) notFound();
  const card = researchCards.find((c) => c.slug === slug)!;
  const idx = researchCards.findIndex((c) => c.slug === slug);
  const next = researchCards[(idx + 1) % researchCards.length];
  const { Body } = page;
  return (
    <div className="page">
      <PageHead
        crumbs={[{ label: 'Research', href: '/research/' }, { label: card.title }]}
        eyebrow={`Research ${card.n} / 05`}
        title={page.title}
        accent={page.accent}
        lede={page.lede}
      />
      <div className="wrap">
        <Body />
        <div className="block">
          <Link href={`/research/${next.slug}/`} className="next-link" data-cursor="Next">
            <span className="mono">Next: {next.n}</span>
            <span className="next-t">{next.title}</span>
            <svg viewBox="0 0 40 40" aria-hidden><path d="M4 20 H34 M22 8 L34 20 L22 32" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
