/**
 * Every technical statement on the site carries one of these. They are the
 * credibility layer (PRD section 13) and are rendered by <Status />, which
 * pairs colour with a glyph and a text label so colour is never the only cue.
 */
export type Evidence =
  | 'demonstrated'
  | 'proposed'
  | 'validate'
  | 'public'
  | 'project'
  | 'concept';

export interface Source {
  id: string;
  publisher: string;
  title: string;
  date: string;
  url: string;
  accessed: string;
  usage: string;
}

export interface Stat {
  value: string;
  /** Numeric part for the counter animation, when the value is countable. */
  count?: number;
  prefix?: string;
  suffix?: string;
  label: string;
  qualifier: string;
  sourceId: string;
}

export interface Component {
  n: number;
  key: 'platform' | 'mesh' | 'storage' | 'wick' | 'overflow';
  title: string;
  short: string;
  long: string;
  status: Evidence;
  statusLabel: string;
}

export interface Insight {
  theme: string;
  quote: string;
  observation: string;
  response: string;
}

export interface TeamMember {
  name: string;
  role: string;
  focus: string;
  portrait: string;
  slug: string;
  linkedin?: string;
}

export interface NavItem {
  label: string;
  href: string;
}
