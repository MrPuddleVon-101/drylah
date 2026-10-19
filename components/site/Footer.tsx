import Link from 'next/link';

import { footerCopy, footerNav } from '@/content/site';

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-cta" data-reveal>
          <p className="footer-kicker">Nursery, test lab or collaborator?</p>
          <Link href="/order/?type=nursery" className="footer-big" data-cursor="Talk">
            Talk to us
            <svg viewBox="0 0 40 40" aria-hidden><path d="M6 34 L34 6 M14 6 H34 V26" fill="none" stroke="currentColor" strokeWidth="2.2" /></svg>
          </Link>
        </div>
        <nav className="footer-nav" aria-label="Footer">
          {footerNav.map((n) => (
            <Link key={n.href} href={n.href}>{n.label}</Link>
          ))}
        </nav>
      </div>

      <div className="footer-word" aria-hidden>
        <span>Dry</span><span className="g">Lah!</span>
      </div>

      <div className="footer-base">
        <p className="footer-copy">{footerCopy}</p>
        <div className="footer-meta">
          <span>Singapore, 2026</span>
        </div>
      </div>
    </footer>
  );
}
