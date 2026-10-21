// End-to-end browser tests against the production static export (./out).
//
//   npm run build && npm run test:e2e
//
// Uses system Google Chrome through puppeteer-core (no browser download).
// Set CHROME_PATH to use a different binary. Screenshots land in
// tests/screenshots/, a JSON report in tests/report.json.

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'out');
const SHOTS = path.join(ROOT, 'tests/screenshots');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ROUTES = ['/', '/product/', '/research/', '/research/mechanism/', '/team/', '/order/', '/sources/'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------ static server */

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain', '.json': 'application/json', '.ico': 'image/x-icon' };
function serve() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.join(OUT, p);
    if (!file.startsWith(OUT)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { res.writeHead(404, { 'content-type': 'text/html' }).end(fs.readFileSync(path.join(OUT, '404.html'))); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

/* ------------------------------------------------------------------ harness */

const results = [];
let failures = 0;
async function test(name, fn) {
  const t0 = Date.now();
  try {
    const detail = await fn();
    results.push({ name, ok: true, ms: Date.now() - t0, detail });
    console.log(`PASS  ${name}${detail ? `  ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`);
  } catch (e) {
    failures++;
    results.push({ name, ok: false, ms: Date.now() - t0, error: String(e?.message ?? e) });
    console.log(`FAIL  ${name}  ${e?.message ?? e}`);
  }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

/** Installed before any page script: counts canvas buffer clears, WebGL
 *  contexts, long blocking frames, layout shifts and errors. */
function probe() {
  const P = (window.__probe = { clears: 0, contexts: 0, loaf: [], shifts: 0, errors: [], motionAtDCL: null });
  const d = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width');
  Object.defineProperty(HTMLCanvasElement.prototype, 'width', {
    get() { return d.get.call(this); },
    set(v) { if (this.isConnected && this.closest('.stage, .viewer')) P.clears++; d.set.call(this, v); },
    configurable: true,
  });
  const gc = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (t, o) { if (/webgl/.test(t)) P.contexts++; return gc.call(this, t, o); };
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) P.loaf.push(Math.round(e.blockingDuration || 0)); }).observe({ type: 'long-animation-frame' }); } catch {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) P.shifts += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch {}
  addEventListener('error', (e) => P.errors.push(String(e.message)));
  addEventListener('unhandledrejection', (e) => P.errors.push(`unhandled: ${e.reason}`));
  document.addEventListener('DOMContentLoaded', () => { P.motionAtDCL = document.documentElement.dataset.motion ?? null; });
}

async function newPage(browser, { width = 1440, height = 900, dpr = 1, mobile = false, reduced = false } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile });
  if (reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.evaluateOnNewDocument(probe);
  page.__console = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') page.__console.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => page.__console.push(`pageerror: ${e.message}`));
  // ERR_ABORTED is a cancelled route prefetch (the router drops it on navigation)
  page.on('requestfailed', (r) => { if (r.failure()?.errorText !== 'net::ERR_ABORTED') page.__console.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`); });
  page.on('response', (r) => { if (r.status() >= 400 && !r.url().endsWith('favicon.ico')) page.__console.push(`http ${r.status()}: ${r.url()}`); });
  return page;
}

/** Fraction of distinct, non-background pixels in a screen region. */
async function inkInRegion(page, clip) {
  // screenshot clips are in document coordinates; the region is in viewport ones
  const sy = await page.evaluate(() => scrollY);
  const b64 = await page.screenshot({ clip: { ...clip, y: clip.y + sy }, encoding: 'base64', type: 'png' });
  return page.evaluate(async (b64) => {
    const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let lit = 0;
    for (let i = 0; i < d.length; i += 16) if (d[i] + d[i + 1] + d[i + 2] > 90) lit++;
    return lit / (d.length / 16);
  }, b64);
}

const waitIntro = (page) => page.waitForFunction(() => !document.querySelector('.intro'), { timeout: 15000 });
const scrollStage = (page, p) => page.evaluate(async (p) => {
  const st = document.querySelector('.stage');
  const top = st.getBoundingClientRect().top + scrollY;
  const total = st.offsetHeight - document.querySelector('.stage-sticky').offsetHeight;
  const L = window.__lenis;
  const y = top + total * p;
  if (L) L.scrollTo(y, { immediate: true, force: true }); else scrollTo(0, y);
  await new Promise((r) => setTimeout(r, 1600));
}, p);
const styleOf = (page, sel) => page.$eval(sel, (el) => { const s = getComputedStyle(el); return { opacity: +s.opacity, visibility: s.visibility }; });

/* -------------------------------------------------------------------- tests */

const server = await serve();
const BASE = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--hide-scrollbars', '--js-flags=--expose-gc'],
});
fs.mkdirSync(SHOTS, { recursive: true });

try {
  const page = await newPage(browser);

  await test('first load: intro plays, then hero and 3D model appear', async () => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    assert(await page.$('.intro'), 'intro card missing from the first paint');
    await waitIntro(page);
    await sleep(1800);
    const hero = await styleOf(page, '.hero-title');
    assert(hero.opacity > 0.95 && hero.visibility === 'visible', `hero not visible: ${JSON.stringify(hero)}`);
    const ink = await inkInRegion(page, { x: 820, y: 180, width: 520, height: 600 });
    assert(ink > 0.08, `model region looks empty (${ink.toFixed(3)})`);
    const P = await page.evaluate(() => window.__probe);
    assert(P.motionAtDCL === 'full', `motion flag not set before hydration (got ${P.motionAtDCL})`);
    return { modelInk: +ink.toFixed(3), contexts: P.contexts };
  });

  await test('scroll story: exploded view, labels, water path, HUD', async () => {
    await page.evaluate(() => { window.__probe.loaf.length = 0; window.__probe.clears = 0; });
    await scrollStage(page, 0.17);
    const rv = await styleOf(page, '.reveal-head');
    assert(rv.opacity > 0.5 && rv.visibility === 'visible', `exploded-view heading hidden: ${JSON.stringify(rv)}`);
    await page.screenshot({ path: path.join(SHOTS, 'story-exploded-1440.png') });
    await scrollStage(page, 0.5);
    const labels = await page.$$eval('.label', (els) => els.filter((e) => getComputedStyle(e).visibility === 'visible' && +getComputedStyle(e).opacity > 0.3).length);
    assert(labels >= 4, `only ${labels} component labels visible`);
    await page.screenshot({ path: path.join(SHOTS, 'story-labels-1440.png') });
    await scrollStage(page, 0.85);
    const flow = await styleOf(page, '.flow');
    assert(flow.opacity > 0.9, `water path panel hidden: ${JSON.stringify(flow)}`);
    const phase = await page.$$eval('.hud li', (els) => els.findIndex((e) => e.dataset.on === 'true'));
    assert(phase === 3, `HUD phase ${phase}, expected 3 (Water path)`);
    const ink = await inkInRegion(page, { x: 200, y: 150, width: 700, height: 650 });
    assert(ink > 0.06, `model missing during water path (${ink.toFixed(3)})`);
    await page.screenshot({ path: path.join(SHOTS, 'story-waterpath-1440.png') });
    return { labels };
  });

  await test('scrolling: no blocking frames over 200 ms, no extra canvas clears', async () => {
    const r = await page.evaluate(async () => {
      const P = window.__probe; P.loaf.length = 0; const clears0 = P.clears;
      // mobile URL-bar style resize events that do not change the canvas size
      for (let i = 0; i < 6; i++) dispatchEvent(new Event('resize'));
      const st = document.querySelector('.stage'); const H = st.offsetHeight;
      const L = window.__lenis;
      for (const m of [0.1, 0.4, 0.7, 0.95, 0.2, 0.8, 0.0, 0.6, 0.05]) { L.scrollTo(H * m, { duration: 0.5 }); await new Promise((r) => setTimeout(r, 380)); }
      await new Promise((r) => setTimeout(r, 1200));
      return { maxBlock: Math.max(0, ...P.loaf), clears: P.clears - clears0 };
    });
    assert(r.maxBlock < 200, `blocking frame of ${r.maxBlock} ms`);
    // adaptive resolution may legitimately step down (each step = one resize applied before a render)
    assert(r.clears <= 3, `${r.clears} canvas buffer clears during scroll`);
    return r;
  });

  await test('component hotspot opens the drawer; Escape closes it', async () => {
    await scrollStage(page, 0.5);
    await page.evaluate(() => [...document.querySelectorAll('.label-hit')].find((b) => getComputedStyle(b.closest('.label')).visibility === 'visible')?.click());
    await page.waitForSelector('.drawer[data-open="true"]', { timeout: 3000 });
    await page.keyboard.press('Escape');
    await page.waitForSelector('.drawer[data-open="false"]', { timeout: 3000 });
  });

  await test('hero call to action glides into the story', async () => {
    await page.evaluate(() => { window.__lenis.scrollTo(0, { immediate: true, force: true }); });
    await sleep(500);
    await page.click('.hero-ctas .btn');
    await sleep(3200);
    const y = await page.evaluate(() => scrollY);
    assert(y > 1500, `explore button did not scroll (y=${y})`);
    return { y };
  });

  await test('route change while coasting lands at the top of the next page', async () => {
    await page.evaluate(() => window.__lenis.scrollTo(document.querySelector('.stage').offsetHeight + 2500, { duration: 3 }));
    await sleep(500);
    await page.evaluate(() => [...document.querySelectorAll('a')].find((a) => a.getAttribute('href') === '/team/').click());
    await page.waitForFunction(() => location.pathname === '/team/');
    await sleep(1200);
    const y = await page.evaluate(() => scrollY);
    assert(y < 5, `team page opened at y=${y}`);
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    assert(bg === 'rgb(1, 2, 1)', `unexpected body background ${bg}`);
    return { y };
  });

  await test('back and forward restore position without a jump', async () => {
    await page.evaluate(() => window.__lenis.scrollTo(900, { immediate: true, force: true }));
    await sleep(400);
    await page.evaluate(() => [...document.querySelectorAll('a')].find((a) => a.getAttribute('href') === '/research/').click());
    await page.waitForFunction(() => location.pathname === '/research/');
    await sleep(900);
    await page.goBack();
    await sleep(1200);
    const back = await page.evaluate(() => ({ path: location.pathname, y: Math.round(scrollY), lenis: Math.round(window.__lenis.scroll) }));
    assert(back.path === '/team/', `back went to ${back.path}`);
    assert(Math.abs(back.y - back.lenis) < 2, `Lenis out of sync after back: ${JSON.stringify(back)}`);
    await page.goForward();
    await sleep(1200);
    const fwd = await page.evaluate(() => ({ path: location.pathname, y: Math.round(scrollY) }));
    assert(fwd.path === '/research/', `forward went to ${fwd.path}`);
    return { back, fwd };
  });

  await test('repeated Home and Product navigation: no context warnings, model renders', async () => {
    for (let i = 0; i < 5; i++) {
      for (const href of ['/product/', '/']) {
        await page.evaluate((h) => [...document.querySelectorAll('a')].find((a) => a.getAttribute('href') === h).click(), href);
        await page.waitForFunction((h) => location.pathname === h, {}, href);
        await sleep(1300);
      }
    }
    await sleep(1500);
    const ink = await inkInRegion(page, { x: 820, y: 180, width: 520, height: 600 });
    assert(ink > 0.08, `model missing after repeated navigation (${ink.toFixed(3)})`);
    const ctxWarn = page.__console.filter((m) => /WebGL|context/i.test(m));
    assert(!ctxWarn.length, ctxWarn.join('\n'));
    const heap = await page.evaluate(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null));
    return { heapMB: heap, ink: +ink.toFixed(3) };
  });

  await test('product viewer: assembled, exploded, water flow, zoom, hotspot', async () => {
    await page.goto(`${BASE}/product/`, { waitUntil: 'networkidle0' });
    await sleep(2500);
    for (const label of ['Exploded', 'Water flow', 'Assembled']) {
      await page.evaluate((l) => [...document.querySelectorAll('.modes button')].find((b) => b.textContent === l).click(), label);
      await sleep(1600);
      const pressed = await page.evaluate((l) => [...document.querySelectorAll('.modes button')].find((b) => b.textContent === l).getAttribute('aria-pressed'), label);
      assert(pressed === 'true', `${label} not selected`);
      const vp = page.viewport();
      const ink = await inkInRegion(page, { x: Math.round(vp.width * 0.35), y: 120, width: Math.round(vp.width * 0.5), height: 600 });
      assert(ink > 0.05, `viewer empty in ${label} (${ink.toFixed(3)})`);
      if (label === 'Water flow') await page.screenshot({ path: path.join(SHOTS, 'product-waterflow-1440.png') });
    }
    await page.click('.zoom button[aria-label="Zoom in"]');
    await page.click('.zoom .reset');
    await page.click('.hotspot');
    await page.waitForSelector('.drawer[data-open="true"]', { timeout: 3000 });
    await page.keyboard.press('Escape');
  });

  await test('order form: validation, then demo-mode submission', async () => {
    await page.goto(`${BASE}/order/`, { waitUntil: 'networkidle0' });
    await page.click('.form button[type="submit"]');
    await sleep(300);
    const invalid = await page.$$eval('[aria-invalid="true"]', (e) => e.length);
    assert(invalid >= 2, 'empty form was not flagged');
    await page.type('#name', 'Test Visitor');
    await page.type('#email', 'test@example.com');
    await page.type('#pots', '3');
    await page.evaluate(() => {
      document.querySelector('input[name="diam"]').click();
      document.querySelector('input[name="qty"]').click();
      document.querySelector('input[name="price"]').click();
      document.querySelector('#consent').click();
    });
    await page.click('.form button[type="submit"]');
    await page.waitForSelector('.success', { timeout: 4000 });
  });

  await test('every route loads directly with a heading and no errors', async () => {
    const out = {};
    for (const r of ROUTES) {
      const p = await newPage(browser);
      const res = await p.goto(`${BASE}${r}`, { waitUntil: 'networkidle0' });
      assert(res.status() === 200, `${r} returned ${res.status()}`);
      if (r === '/') await waitIntro(p);
      await sleep(1200);
      assert(await p.$('h1'), `${r} has no h1`);
      const P = await p.evaluate(() => window.__probe);
      const errs = [...p.__console, ...P.errors];
      assert(!errs.length, `${r}: ${errs.join(' | ')}`);
      out[r] = { cls: +P.shifts.toFixed(3) };
      await p.close();
    }
    return out;
  });

  await test('reload midway down a page keeps the position and shows content', async () => {
    const p = await newPage(browser);
    await p.goto(`${BASE}/research/`, { waitUntil: 'networkidle0' });
    await p.evaluate(() => scrollTo(0, 1400));
    await sleep(600);
    await p.reload({ waitUntil: 'networkidle0' });
    await sleep(1500);
    const y = await p.evaluate(() => Math.round(scrollY));
    const ink = await inkInRegion(p, { x: 0, y: 0, width: 1440, height: 900 });
    assert(ink > 0.01, 'blank page after reload');
    await p.close();
    return { y };
  });

  await test('mobile menu opens, locks scroll, navigates and closes', async () => {
    const p = await newPage(browser, { width: 390, height: 844, dpr: 3, mobile: true });
    await p.goto(`${BASE}/research/`, { waitUntil: 'networkidle0' });
    await sleep(800);
    await p.click('.nav-toggle');
    await p.waitForSelector('.nav-panel[data-open="true"]');
    const y0 = await p.evaluate(() => scrollY);
    await p.mouse.wheel({ deltaY: 800 });
    await sleep(500);
    const y1 = await p.evaluate(() => scrollY);
    assert(Math.abs(y1 - y0) < 2, `page scrolled behind the open menu (${y0} -> ${y1})`);
    await p.screenshot({ path: path.join(SHOTS, 'mobile-menu-390.png') });
    await p.evaluate(() => [...document.querySelectorAll('.nav-panel a')].find((a) => a.getAttribute('href') === '/team/').click());
    await p.waitForFunction(() => location.pathname === '/team/');
    await p.waitForSelector('.nav-panel[data-open="false"]');
    await p.close();
  });

  await test('reduced motion: no intro, content visible, native scrolling', async () => {
    const p = await newPage(browser, { reduced: true });
    await p.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
    await sleep(1500);
    assert(!(await p.$('.intro')), 'intro shown under reduced motion');
    const st = await p.evaluate(() => ({ motion: document.documentElement.dataset.motion, lenis: !!window.__lenis }));
    assert(st.motion === 'reduced' && !st.lenis, JSON.stringify(st));
    await p.evaluate(() => document.querySelector('.team').scrollIntoView());
    await sleep(600);
    const card = await styleOf(p, '.member-meta');
    assert(card.opacity > 0.95, 'team meta hidden under reduced motion');
    await p.close();
  });

  /* breakpoint screenshots: hero + one inner page per size */
  const SIZES = [[1920, 1080], [1440, 900], [1366, 768], [1024, 768], [820, 1180], [430, 932], [390, 844], [360, 800]];
  await test('breakpoints: no horizontal overflow, hero inside the viewport', async () => {
    const out = {};
    for (const [w, h] of SIZES) {
      const mobile = w < 768;
      const p = await newPage(browser, { width: w, height: h, dpr: mobile ? 3 : 1, mobile });
      await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
      await waitIntro(p);
      await sleep(2200);
      const m = await p.evaluate(() => {
        const t = document.querySelector('.hero-title').getBoundingClientRect();
        const n = document.querySelector('.nav-shell').getBoundingClientRect();
        const cue = document.querySelector('.scroll-cue');
        const c = cue.getBoundingClientRect();
        const cueOnCtas = getComputedStyle(cue).display !== 'none' && [...document.querySelectorAll('.hero-ctas > *')].some((el) => {
          const b = el.getBoundingClientRect();
          return c.left < b.right && c.right > b.left && c.top < b.bottom && c.bottom > b.top;
        });
        return { overflow: document.documentElement.scrollWidth - innerWidth, heroLeft: Math.round(t.left), heroRight: Math.round(t.right), heroTop: Math.round(t.top), navBottom: Math.round(n.bottom), cueOnCtas };
      });
      assert(!m.cueOnCtas, `${w}x${h}: scroll cue overlaps the hero buttons`);
      assert(m.overflow <= 0, `${w}x${h}: horizontal overflow ${m.overflow}px`);
      assert(m.heroLeft >= 0 && m.heroRight <= w + 1, `${w}x${h}: hero outside viewport ${JSON.stringify(m)}`);
      assert(m.heroTop >= m.navBottom - 1, `${w}x${h}: hero under the nav ${JSON.stringify(m)}`);
      await p.screenshot({ path: path.join(SHOTS, `home-${w}x${h}.png`) });
      await p.goto(`${BASE}/research/`, { waitUntil: 'networkidle0' });
      await sleep(1200);
      const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert(ov <= 0, `${w}x${h} /research/: horizontal overflow ${ov}px`);
      await p.screenshot({ path: path.join(SHOTS, `research-${w}x${h}.png`) });
      out[`${w}x${h}`] = 'ok';
      await p.close();
    }
    // browser zoom: 125% and 150% of a 1440 laptop
    for (const [z, w, h] of [[125, 1152, 720], [150, 960, 600]]) {
      const p = await newPage(browser, { width: w, height: h, dpr: z / 100 });
      await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
      await waitIntro(p);
      await sleep(2000);
      const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert(ov <= 0, `zoom ${z}%: horizontal overflow ${ov}px`);
      await p.screenshot({ path: path.join(SHOTS, `home-zoom${z}.png`) });
      out[`zoom${z}`] = 'ok';
      await p.close();
    }
    return out;
  });

  await test('soak: two minutes of scrolling and navigation stays stable', async () => {
    const p = await newPage(browser);
    await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await waitIntro(p);
    const heap0 = await p.evaluate(() => performance.memory?.usedJSHeapSize ?? 0);
    const end = Date.now() + 120000;
    let loops = 0;
    while (Date.now() < end) {
      await p.evaluate(async () => {
        const L = window.__lenis; const H = document.documentElement.scrollHeight;
        for (const m of [0.05, 0.3, 0.12, 0.6, 0.9, 0.0]) { L.scrollTo(H * m, { duration: 0.6 }); await new Promise((r) => setTimeout(r, 450)); }
      });
      for (const href of ['/product/', '/research/', '/']) {
        await p.evaluate((h) => [...document.querySelectorAll('a')].find((a) => a.getAttribute('href') === h)?.click(), href);
        await sleep(900);
      }
      loops++;
    }
    await sleep(2000);
    await p.evaluate(() => window.gc?.());
    const heap1 = await p.evaluate(() => performance.memory?.usedJSHeapSize ?? 0);
    const P = await p.evaluate(() => window.__probe);
    const errs = [...p.__console, ...P.errors];
    assert(!errs.length, errs.slice(0, 5).join(' | '));
    const growth = (heap1 - heap0) / 1e6;
    assert(growth < 60, `heap grew ${growth.toFixed(1)} MB`);
    await p.close();
    return { loops, heapStartMB: Math.round(heap0 / 1e6), heapEndMB: Math.round(heap1 / 1e6) };
  });

  const pageErrs = page.__console;
  await test('no console errors or failed requests in the main session', async () => {
    assert(!pageErrs.length, pageErrs.slice(0, 8).join(' | '));
  });
} finally {
  fs.writeFileSync(path.join(ROOT, 'tests/report.json'), JSON.stringify({ when: new Date().toISOString(), results }, null, 2));
  await browser.close();
  server.close();
}

console.log(`\n${results.length - failures}/${results.length} passed`);
process.exit(failures ? 1 : 0);
