import type { NavItem, TeamMember } from '@/lib/types';

export const site = {
  name: 'DryLah!',
  title: 'DryLah! | A Smarter Base for Plant Pot Drainage',
  description:
    'Explore DryLah!, a Singapore student product concept designed to make water beneath plant pots harder for mosquitoes to reach. See the prototype, evidence and testing plan.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mrpuddlevon-101.github.io/drylah',
  promise: 'Plant can drink. Mozzie cannot.',
  status: 'Concept under testing',
  coords: '1.3521° N  103.8198° E',
};

export const nav: NavItem[] = [
  { label: 'Product', href: '/product/' },
  { label: 'Evidence', href: '/#evidence' },
  { label: 'Research', href: '/research/' },
  { label: 'Team', href: '/team/' },
];

export const footerNav: NavItem[] = [
  { label: 'Product', href: '/product/' },
  { label: 'Research', href: '/research/' },
  { label: 'Testing', href: '/research/testing/' },
  { label: 'Sources', href: '/sources/' },
  { label: 'Team', href: '/team/' },
  { label: 'Order interest', href: '/order/' },
  { label: 'Contact', href: '/order/#contact' },
];

export const hero = {
  eyebrow: 'A Singapore household dengue-prevention concept',
  headline: ['Plant can drink.', 'Mozzie cannot.'],
  support:
    'A covered base for the pot you already own.',
  primary: 'Explore the prototype',
  secondary: 'Join the pilot',
  note: 'Concept under testing. Mosquito exclusion has not yet been verified.',
};

export const team: TeamMember[] = [
  {
    name: 'Vedant Rastogi',
    role: 'Pitch and commercial model',
    focus: 'Turn evidence into a credible story and quote-based cost model',
    portrait: '/team/vedant-rastogi-tone.png',
    slug: 'vedant',
    linkedin: 'https://www.linkedin.com/in/vedant-rastogi-a9959938b',
  },
  {
    name: 'Shaurya Wadhawan',
    role: 'Prototype and bench testing',
    focus: 'Build the assembly and record drainage, stability and overflow results',
    portrait: '/team/shaurya-wadhawan-tone.png',
    slug: 'shaurya',
    linkedin: 'https://www.linkedin.com/in/shaurya-wadhawan-8992253a4/',
  },
  {
    name: 'Christian Huray',
    role: 'Test records and product design',
    focus: 'Document failures, revisions and the evidence behind each claim',
    portrait: '/team/christian-huray-tone.png',
    slug: 'christian',
  },
  {
    name: 'Chng En',
    role: 'User research and outreach',
    focus: 'Speak to plant owners and nursery operators and observe the routine',
    portrait: '/team/chng-en-tone.png',
    slug: 'chng',
    linkedin: 'https://www.linkedin.com/in/en-chng-ernest/',
  },
];

export const faq = [
  {
    q: 'Does DryLah! eradicate dengue?',
    a: 'No. DryLah! is a narrow household concept intended to reduce mosquito access to water beneath suitable plant pots. Dengue prevention requires multiple measures.',
  },
  {
    q: 'Has mosquito exclusion been proven?',
    a: 'Not yet. The physical prototype demonstrated basic assembly, support and drainage. Exclusion requires a controlled protocol and independent review.',
  },
  {
    q: 'Does it remove existing Aedes eggs?',
    a: 'No. Eggs can adhere to container walls and survive drying. The concept is intended to reduce future access, not erase eggs already present.',
  },
  {
    q: 'Will I never need to clean it?',
    a: 'That has not been established. Cleaning burden, debris, blockage and long-term maintenance are part of the testing plan.',
  },
  {
    q: 'Can I use my existing pot?',
    a: 'That is the design goal. Final compatibility and size coverage still need fit testing.',
  },
  {
    q: 'Can I buy it now?',
    a: 'Not yet. The Order page registers interest only and takes no payment.',
  },
  {
    q: 'What is the target price?',
    a: 'The current target is S$4.90, subject to supplier quotations, final design and testing.',
  },
];

export const footerCopy =
  'A student concept from Singapore. Mosquito exclusion, dengue impact, plant fit and final price are still being tested.';
