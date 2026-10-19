import Link from 'next/link';

import { Split } from './ui';

export function PageHead({
  crumbs, eyebrow, title, accent, lede,
}: {
  crumbs?: { label: string; href?: string }[];
  eyebrow?: string;
  title: string[];
  accent?: string[];
  lede?: string;
}) {
  return (
    <header className="page-head">
      {crumbs && (
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          {crumbs.map((c) => (
            <span key={c.label} style={{ display: 'contents' }}>
              <span aria-hidden>/</span>
              {c.href ? <Link href={c.href}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
            </span>
          ))}
        </nav>
      )}
      {eyebrow && (
        <p className="eyebrow" data-reveal><span className="eyebrow-rule" aria-hidden /><span>{eyebrow}</span></p>
      )}
      <Split as="h1" text={title} accent={accent} className="h-xl" />
      {lede && <p className="page-lede" data-reveal>{lede}</p>}
    </header>
  );
}
