'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { components, steps } from '@/content/product';
import { hero } from '@/content/site';
import { Drawer } from '@/components/site/Drawer';
import { Btn, Status, track } from '@/components/site/ui';
import type { EngineHandle, FrameInfo } from '@/components/three/engine';
import { Intro } from './Intro';
import { asset } from '@/lib/asset';

/* Mirrors STORY in engine.ts. Kept local so the copy can render before the
   engine module has loaded. */
const S = {
  heroOut: 0.1,
  explode: [0.1, 0.22],
  labels: [0.24, 0.62],
  flowIn: [0.64, 0.72],
  end: 0.97,
} as const;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const span = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

const PHASES = ['Assembled', 'Exploded', 'Components', 'Water path'];

export function Stage() {
  const stageRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<EngineHandle | null>(null);
  const progressRef = useRef(0);

  const heroRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const flowRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLButtonElement>(null);
  const auraRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lineRefs = useRef<(SVGPathElement | null)[]>([]);
  const dotRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);
  const phaseRefs = useRef<(HTMLLIElement | null)[]>([]);
  const labelSize = useRef<{ w: number; h: number }[]>([]);

  const [ready, setReady] = useState(false);
  const [live, setLive] = useState(false);
  const [failed, setFailed] = useState(false);
  const [motion, setMotion] = useState(true);
  const [drawer, setDrawer] = useState<number | null>(null);

  /* scroll progress through the pinned stage */
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const el = stageRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - innerHeight;
      progressRef.current = total > 0 ? clamp01(-r.top / total) : 0;
      // pause the renderer once the stage is fully off screen
      handleRef.current?.setPaused(r.bottom < -50 || r.top > innerHeight + 50);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* per-frame DOM choreography, driven by the engine's smoothed progress */
  const onFrame = useCallback((f: FrameInfo) => {
    const p = f.progress;
    const narrow = f.width < 1024;

    // hero copy lifts away as the model starts to open
    const h = 1 - span(p, 0.035, S.heroOut);
    if (heroRef.current) {
      heroRef.current.style.opacity = String(h);
      heroRef.current.style.transform = `translate3d(0, ${(1 - h) * -60}px, 0)`;
      heroRef.current.style.visibility = h <= 0.001 ? 'hidden' : 'visible';
    }
    if (cueRef.current) {
      const c = 1 - span(p, 0.0, 0.05);
      cueRef.current.style.opacity = String(c);
      cueRef.current.style.visibility = c <= 0.001 ? 'hidden' : 'visible';
    }
    // soft aura that follows the model on screen, so it reads as the hero
    if (auraRef.current) {
      const r = Math.max(160, f.center.r * 1.6);
      auraRef.current.style.transform = `translate3d(${f.center.x - r}px, ${f.center.y - r}px, 0)`;
      auraRef.current.style.width = auraRef.current.style.height = `${r * 2}px`;
    }

    // "A different base" heading during the exploded view
    const rv = span(p, S.explode[0] + 0.01, S.explode[1] - 0.02) * (1 - span(p, S.labels[0] - 0.01, S.labels[0] + 0.025));
    if (revealRef.current) {
      revealRef.current.style.opacity = String(rv);
      revealRef.current.style.transform = `translate3d(0, ${(1 - ease(rv)) * 30}px, 0)`;
      revealRef.current.style.visibility = rv <= 0.001 ? 'hidden' : 'visible';
    }

    // labels pop onto the parts one at a time and stay
    const w = (S.labels[1] - S.labels[0]) / 5;
    const out = 1 - span(p, S.labels[1] - 0.01, S.flowIn[0] + 0.01);
    const active = p >= S.labels[0] && p < S.labels[1] ? Math.min(4, Math.floor((p - S.labels[0]) / w)) : -1;

    // stack labels that share a side so they never overlap: sort by anchor
    // height, push each below the previous, then lift the column if it runs
    // off the bottom
    const top = 96, bottom = f.height - 120;
    const slotY: number[] = [];
    for (const side of [1, -1]) {
      const col = [0, 1, 2, 3, 4]
        .filter((i) => f.anchors[i].side === side)
        .map((i) => ({ i, y: f.anchors[i].y - 18, h: (labelSize.current[i]?.h ?? 90) + 14 }))
        .sort((a, b) => a.y - b.y);
      for (let k = 0; k < col.length; k++) {
        col[k].y = Math.max(col[k].y, k ? col[k - 1].y + col[k - 1].h : top);
      }
      const over = col.length ? col[col.length - 1].y + col[col.length - 1].h - bottom : 0;
      if (over > 0) for (const c of col) c.y = Math.max(top, c.y - over);
      for (const c of col) slotY[c.i] = c.y;
    }

    for (let i = 0; i < 5; i++) {
      const a = f.anchors[i];
      const t = span(p, S.labels[0] + i * w - w * 0.15, S.labels[0] + i * w + w * 0.3);
      const vis = t * out;
      const el = labelRefs.current[i];
      const line = lineRefs.current[i];
      const dot = dotRefs.current[i];
      const isActive = i === active;
      if (dot) {
        dot.style.transform = `translate3d(${a.x}px, ${a.y}px, 0) scale(${0.4 + ease(vis) * 0.6})`;
        dot.style.opacity = String(vis);
        dot.dataset.active = String(isActive);
      }
      if (!el) continue;
      el.dataset.active = String(isActive);
      el.style.visibility = vis <= 0.001 ? 'hidden' : 'visible';
      if (narrow) {
        el.style.opacity = String(isActive ? vis : 0);
        el.style.transform = '';
        if (line) line.style.opacity = '0';
        continue;
      }
      const gap = Math.min(140, f.width * 0.07);
      const bw = labelSize.current[i]?.w ?? 300;
      const bx = a.side > 0 ? a.x + gap : a.x - gap - bw;
      const x = Math.max(24, Math.min(f.width - bw - 24, bx));
      const y = slotY[i];
      el.style.opacity = String(vis * (isActive || active === -1 ? 1 : 0.55));
      el.style.transform = `translate3d(${x}px, ${y + (1 - ease(t)) * 14}px, 0)`;
      if (line) {
        const ex = a.side > 0 ? x - 10 : x + bw + 10;
        const ey = y + 18;
        const mx = a.x + (ex - a.x) * 0.45;
        line.setAttribute('d', `M${a.x},${a.y} L${mx},${a.y} L${mx + (ey - a.y) * 0.0},${ey} L${ex},${ey}`);
        const len = Math.abs(ex - a.x) + Math.abs(ey - a.y) + 4;
        line.style.strokeDasharray = `${len}`;
        line.style.strokeDashoffset = `${len * (1 - ease(t))}`;
        line.style.opacity = String(vis * (isActive || active === -1 ? 1 : 0.5));
      }
    }

    // "tap any part" hint while the labels are out
    if (hintRef.current) {
      const hv = span(p, S.labels[0] + 0.02, S.labels[0] + 0.06) * out;
      hintRef.current.style.opacity = String(hv);
      hintRef.current.style.visibility = hv <= 0.001 ? 'hidden' : 'visible';
    }
    dotRefs.current.forEach((d) => { if (d) d.style.pointerEvents = out > 0.5 && p > S.labels[0] ? 'auto' : 'none'; });

    // water path: four steps
    const fl = span(p, S.flowIn[0] + 0.02, S.flowIn[1]);
    if (flowRef.current) {
      flowRef.current.style.opacity = String(fl);
      flowRef.current.style.transform = `translate3d(${(1 - ease(fl)) * 40}px, 0, 0)`;
      flowRef.current.style.visibility = fl <= 0.001 ? 'hidden' : 'visible';
    }
    const sw = (S.end - S.flowIn[1]) / 4;
    const step = p >= S.flowIn[1] ? Math.min(3, Math.floor((p - S.flowIn[1]) / sw)) : 0;
    stepRefs.current.forEach((el, i) => {
      if (!el) return;
      el.dataset.state = i < step ? 'past' : i === step ? 'on' : 'next';
      const local = i === step ? span(p, S.flowIn[1] + i * sw, S.flowIn[1] + (i + 1) * sw) : i < step ? 1 : 0;
      el.style.setProperty('--fill', String(local));
    });

    // HUD
    const phase = p < S.explode[0] ? 0 : p < S.labels[0] ? 1 : p < S.flowIn[0] ? 2 : 3;
    phaseRefs.current.forEach((el, i) => { if (el) el.dataset.on = String(i === phase); });
    if (hudRef.current) {
      hudRef.current.style.setProperty('--p', String(p));
      hudRef.current.style.opacity = String(1 - span(p, 0.985, 1));
    }
  }, []);

  /* label sizes, measured off the frame loop so it never forces layout */
  useEffect(() => {
    const els = labelRefs.current.filter(Boolean) as HTMLDivElement[];
    const measure = () => {
      labelSize.current = labelRefs.current.map((el) => (el ? { w: el.offsetWidth, h: el.offsetHeight } : { w: 300, h: 90 }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    els.forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, []);

  /* engine */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let onResize: (() => void) | null = null;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) setMotion(false);
    import('@/components/three/engine')
      .then(({ createEngine }) => {
        if (disposed) return;
        try {
          const handle = createEngine(canvas, {
            mode: 'story',
            reducedMotion: reduced,
            getProgress: () => progressRef.current,
            onFrame,
            onReady: () => setReady(true),
          });
          handleRef.current = handle;
          if (process.env.NODE_ENV !== 'production') (window as unknown as Record<string, unknown>).__engine = handle;
          onResize = () => handle.resize();
          addEventListener('resize', onResize, { passive: true });
        } catch {
          setFailed(true);
          setReady(true);
        }
      })
      .catch(() => { setFailed(true); setReady(true); });
    return () => {
      disposed = true;
      if (onResize) removeEventListener('resize', onResize);
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, [onFrame]);

  const onWipe = useCallback(() => {
    setLive(true);
    const fire = () => handleRef.current?.intro();
    fire();
    // engine may still be loading; try again shortly
    setTimeout(fire, 300);
    setTimeout(fire, 900);
  }, []);

  const toggleMotion = () => {
    setMotion((m) => {
      handleRef.current?.setMotion(!m);
      return !m;
    });
  };

  const openPart = (i: number) => { setDrawer(i); };

  /** Glide to the moment the first label lands. */
  const explore = () => {
    track('hero_explore_clicked');
    const el = stageRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + scrollY;
    const to = top + (el.offsetHeight - innerHeight) * (S.labels[0] + 0.03);
    const lenis = (window as unknown as { __lenis?: { scrollTo(y: number, o?: object): void } }).__lenis;
    if (lenis) lenis.scrollTo(to, { duration: 2.4 });
    else scrollTo({ top: to, behavior: 'smooth' });
  };

  return (
    <>
      <Intro ready={ready} onWipe={onWipe} />
      <section className="stage" ref={stageRef} data-live={live} data-failed={failed} aria-label="DryLah! product">
        <div className="stage-sticky">
          <div className="stage-aura" ref={auraRef} aria-hidden />
          <canvas ref={canvasRef} className="stage-canvas" aria-hidden />
          {failed && (
            <div className="stage-fallback">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset('/img/concept-drawing.webp')} alt="Exploded concept drawing of the DryLah base: perforated platform, mesh, pebble storage layer, wick and screened overflow." />
            </div>
          )}
          <p className="sr-only">
            Interactive 3D model of the DryLah base under a terracotta pot. Scrolling separates it into five parts:
            the raised support platform, the mosquito-blocking mesh, the mineral storage layer, the capillary wick and
            the screened overflow. The full list is below.
          </p>

          {/* hero */}
          <div className="hero" ref={heroRef}>
            <p className="hero-eyebrow"><span className="pip" aria-hidden />{hero.eyebrow}</p>
            <h1 className="hero-title">
              <span className="hero-line"><span>{hero.headline[0]}</span></span>
              <span className="hero-line hero-line-2">
                <span>Mozzie <em>cannot.<svg className="hero-brush" viewBox="0 0 600 40" preserveAspectRatio="none" aria-hidden>
                  <path d="M6 26 C 120 14, 260 12, 380 16 S 560 22, 594 14" />
                </svg></em></span>
              </span>
            </h1>
            <p className="hero-support">{hero.support}</p>
            <div className="hero-ctas">
              <Btn cursor="Open it" onClick={explore}>{hero.primary}</Btn>
              <Btn href="/order/" variant="ghost" cursor="Pilot">{hero.secondary}</Btn>
            </div>
          </div>

          {/* exploded view heading */}
          <div className="reveal-head" ref={revealRef}>
            <p className="beat-k">The product reveal</p>
            <h2>A different base.<br /><span>Keep the pot you already own.</span></h2>
          </div>

          {/* labels */}
          <svg className="leaders" aria-hidden>
            {components.map((c, i) => (
              <path key={c.key} ref={(el) => { lineRefs.current[i] = el; }} />
            ))}
          </svg>
          {components.map((c, i) => (
            <button key={c.key} type="button" className="anchor-dot" ref={(el) => { dotRefs.current[i] = el; }} onClick={() => openPart(i)} aria-label={`Open ${c.title}`} tabIndex={-1}><i>{c.n}</i></button>
          ))}
          <div className="labels">
            {components.map((c, i) => (
              <div
                key={c.key}
                className="label"
                data-side={i % 2 === 0 ? 'r' : 'l'}
                ref={(el) => { labelRefs.current[i] = el; }}
              >
                <button type="button" className="label-hit" onClick={() => openPart(i)} data-cursor="Open">
                  <span className="label-n">{String(c.n).padStart(2, '0')}</span>
                  <span className="label-body">
                    <span className="label-title">{c.title}</span>
                    <span className="label-cta">Explore <i aria-hidden>+</i></span>
                  </span>
                </button>
              </div>
            ))}
          </div>

          <div className="labels-hint" ref={hintRef} aria-hidden>
            <span className="labels-hint-dot" />Tap any part to explore it
          </div>

          {/* water path */}
          <div className="flow" ref={flowRef}>
            <p className="beat-k">How it is meant to work</p>
            <h2 className="flow-title">Catch. Separate.<br />Return. Release.</h2>
            <ol className="flow-steps">
              {steps.map((s, i) => (
                <li key={s.label} ref={(el) => { stepRefs.current[i] = el; }} data-state="next">
                  <span className="flow-bar" aria-hidden><i /></span>
                  <span className="flow-n">0{s.n}</span>
                  <div>
                    <h3>{s.label}</h3>
                    <p>{s.copy}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* HUD */}
          <div className="hud" ref={hudRef} aria-hidden>
            <span className="hud-rail"><i /></span>
            <ol>
              {PHASES.map((ph, i) => (
                <li key={ph} ref={(el) => { phaseRefs.current[i] = el; }}>
                  <span>0{i + 1}</span>{ph}
                </li>
              ))}
            </ol>
          </div>

          <div className="stage-foot">
            <button type="button" className="motion-toggle" onClick={toggleMotion} aria-pressed={!motion}>
              <span className="motion-ico" data-on={motion} aria-hidden><i /><i /></span>
              {motion ? 'Pause motion' : 'Play motion'}
            </button>
          </div>
          <button type="button" className="scroll-cue" ref={cueRef} onClick={explore} aria-label="Scroll to open it up" data-magnetic>
            <svg className="scroll-cue-ring" viewBox="0 0 120 120" aria-hidden>
              <defs><path id="cue-circle" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" /></defs>
              <text><textPath href="#cue-circle" textLength="288" lengthAdjust="spacing">SCROLL TO OPEN IT UP • SCROLL TO OPEN IT UP • </textPath></text>
            </svg>
            <span className="scroll-cue-core" aria-hidden>
              <svg viewBox="0 0 24 24"><path d="M12 4 V19 M5 12 L12 19 L19 12" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
            </span>
          </button>
        </div>
      </section>

      {/* list of parts, shown only when WebGL is unavailable */}
      {failed && <section id="how-it-works" className="parts-list" aria-label="The five components">
        <h2 className="sr-only">The five components</h2>
        <ol>
          {components.map((c, i) => (
            <li key={c.key}>
              <button type="button" onClick={() => openPart(i)} data-cursor="Open">
                <span className="parts-n">{String(c.n).padStart(2, '0')}</span>
                <span className="parts-t">{c.title}</span>
                <Status s={c.status} label={c.statusLabel} />
              </button>
            </li>
          ))}
        </ol>
      </section>}

      <Drawer index={drawer} onClose={() => setDrawer(null)} onStep={setDrawer} />
    </>
  );
}
