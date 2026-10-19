import type { Insight, Stat } from '@/lib/types';

/** Landing-page problem stats (PRD section 5, "The overlooked space"). */
export const problemStats: Stat[] = [
  {
    value: '65%',
    count: 65,
    suffix: '%',
    label: 'of Aedes breeding in 2025 cluster areas was in homes',
    qualifier: 'Cluster areas only, not national cases',
    sourceId: 'nea-peak-2026',
  },
  {
    value: '20,469',
    count: 20469,
    label: 'breeding habitats found in 2025',
    qualifier: 'All habitat types',
    sourceId: 'nea-peak-2026',
  },
  {
    value: 'No. 2',
    count: 2,
    prefix: 'No. ',
    label: 'Flowerpot plates among home breeding sites, 2023 to 2025',
    qualifier: 'A rank, not a share',
    sourceId: 'nea-sites',
  },
];

export const interviews: Insight[] = [
  {
    theme: 'Hidden plates get missed',
    quote: 'The bottom ones are easy to forget.',
    observation: 'Plates on lower shelves, under large pots and in crowded corners are the ones that slip.',
    response: 'Passive mechanism instead of reminder-led behaviour',
  },
  {
    theme: 'Responsibility gets blurred',
    quote: 'Sometimes I think my wife has already done it.',
    observation: 'Watering and plate checks can be split across a household, so nobody is sure who did what.',
    response: 'One installed object rather than a shared checklist',
  },
  {
    theme: 'Fit and price affect adoption',
    quote: 'I might need a flatter and smaller version.',
    observation: 'People questioned thickness, fit and the cost of buying a base for every pot.',
    response: 'Lower-profile target, retain existing pots, test S$4.90 and multipacks',
  },
];

export const interviewNote =
  'Twelve household interviews and prototype feedback informed the direction. They do not prove demand or mosquito exclusion.';

export const timeline = [
  { label: '2024', value: 13651, display: '13,651', caption: 'dengue cases' },
  { label: '2025', value: 4000, display: '4,000+', caption: 'dengue cases' },
  { label: 'to 15 May 2026', value: 600, display: '600+', caption: 'cases reported' },
];

export const testingPlan = [
  {
    when: 'Weeks 1 and 2',
    activity: 'Mosquito-free bench checks using loaded pots, normal watering, heavy watering, wet mesh and blocked outlets.',
    gate: 'Stable support, repeatable drainage, no unintended exposed pools and a safe overflow route.',
  },
  {
    when: 'Weeks 3 and 4',
    activity: 'Observe 10 plant owners using a safe mock-up. Record installation, cleaning concerns, size fit and price response.',
    gate: 'Clear usefulness, manageable care burden and credible interest near the target price.',
  },
  {
    when: 'Weeks 5 and 6',
    activity: 'Seek protocol review from a qualified testing or vector-control partner and speak with two nursery operators.',
    gate: 'Independent exclusion protocol and a quote-based manufacturability path.',
  },
];

export const testAreas = [
  { title: 'Drainage and support', detail: 'Loaded pots, normal and heavy watering, stability on uneven floors.' },
  { title: 'Overflow and blockage', detail: 'Wet mesh, blocked outlets, leaf litter and soil fines.' },
  { title: 'Mosquito exclusion', detail: 'Only under a protocol defined or reviewed by a qualified partner.' },
  { title: 'Plant compatibility', detail: 'Which plants and soils benefit from wick return, and which do not.' },
  { title: 'Care, cost and durability', detail: 'Cleaning burden, UV exposure, supplier quotes and final unit cost.' },
];

export const researchCards = [
  {
    slug: 'singapore-dengue',
    n: '01',
    title: 'Singapore context',
    teaser: 'Cases, habitats and where flowerpot plates rank.',
    stat: '13,651',
    statLabel: 'cases in 2024',
  },
  {
    slug: 'household-behaviour',
    n: '02',
    title: 'Household behaviour',
    teaser: 'Twelve conversations. Three decisions that changed the product.',
    stat: '12',
    statLabel: 'household interviews',
  },
  {
    slug: 'mechanism',
    n: '03',
    title: 'Mosquito biology',
    teaser: 'Why a dry-looking surface is not proof of a barrier.',
    stat: '4',
    statLabel: 'points the barrier must hold',
  },
  {
    slug: 'alternatives',
    n: '04',
    title: 'Alternatives',
    teaser: 'A wick or lid alone is not new. Here is the honest comparison.',
    stat: '5',
    statLabel: 'options compared',
  },
  {
    slug: 'testing',
    n: '05',
    title: 'Testing roadmap',
    teaser: 'Six weeks, three gates, and what would make us redesign.',
    stat: '6',
    statLabel: 'weeks to the next proof point',
  },
];
