/**
 * Prefix for files in /public. Empty locally; set NEXT_PUBLIC_BASE_PATH when
 * the site is served from a sub-path (GitHub Pages serves it at /drylah).
 * Next prefixes its own routes and bundles, but not raw <img> src strings.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
export const asset = (path: string) => `${BASE_PATH}${path}`;
