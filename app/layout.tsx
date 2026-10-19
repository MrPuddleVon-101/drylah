import type { Metadata, Viewport } from 'next';
import { Archivo, IBM_Plex_Mono } from 'next/font/google';

import { Cursor } from '@/components/site/Cursor';
import { Footer } from '@/components/site/Footer';
import { Nav } from '@/components/site/Nav';
import { Reveals } from '@/components/site/Reveals';
import { SmoothScroll } from '@/components/site/SmoothScroll';
import { site } from '@/content/site';
import { asset } from '@/lib/asset';

import './globals.css';

const display = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.title, template: '%s | DryLah!' },
  description: site.description,
  applicationName: site.name,
  openGraph: {
    type: 'website',
    siteName: site.name,
    title: `${site.name} | ${site.promise}`,
    description: site.description,
    images: [{ url: asset('/brand/social-card.png'), width: 1200, height: 630, alt: 'DryLah! logo and assembled product. Concept under testing.' }],
  },
  twitter: { card: 'summary_large_image', title: `${site.name} | ${site.promise}`, description: site.description },
  icons: { icon: asset('/brand/mark.png') },
};

export const viewport: Viewport = {
  themeColor: '#030805',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-SG" className={`${display.variable} ${mono.variable}`}>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <SmoothScroll />
        <Cursor />
        <Reveals />
        <Nav />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
