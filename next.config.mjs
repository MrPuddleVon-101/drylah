import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: the whole site is pre-rendered HTML, deployable to GitHub
  // Pages, Netlify, Vercel or any static host. Keeps SEO/metadata per route
  // (PRD FR-12) without running a server.
  output: 'export',
  // GitHub Pages serves the site from /<repo>; empty for local dev.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  // Pin the workspace root: the project sits under the home directory, and
  // without this Turbopack walks up and adopts ~ as the root.
  turbopack: { root: dirname(fileURLToPath(import.meta.url)) },
};

export default nextConfig;
