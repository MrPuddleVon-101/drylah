'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { components } from '@/content/product';
import { Drawer } from '@/components/site/Drawer';
import { Status, track } from '@/components/site/ui';
import type { EngineHandle, FrameInfo, ViewerMode } from '@/components/three/engine';
import { asset } from '@/lib/asset';

const MODES: { id: ViewerMode; label: string }[] = [
  { id: 'assembled', label: 'Assembled' },
  { id: 'exploded', label: 'Exploded' },
  { id: 'flow', label: 'Water flow' },
];

/** Full interactive model: drag to orbit, buttons for everything else. */
export function Viewer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<EngineHandle | null>(null);
  const spotRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [mode, setMode] = useState<ViewerMode>('assembled');
  const [evidence, setEvidence] = useState(false);
  const [drawer, setDrawer] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  const onFrame = useCallback((f: FrameInfo) => {
    f.anchors.forEach((a, i) => {
      const el = spotRefs.current[i];
      if (!el) return;
      el.style.transform = `translate3d(${a.x}px, ${a.y}px, 0)`;
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let onResize: (() => void) | null = null;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    import('@/components/three/engine')
      .then(({ createEngine }) => {
        if (disposed) return;
        try {
          const h = createEngine(canvas, { mode: 'viewer', reducedMotion: reduced, onFrame });
          h.intro();
          handleRef.current = h;
          onResize = () => h.resize();
          addEventListener('resize', onResize, { passive: true });
        } catch { setFailed(true); }
      })
      .catch(() => setFailed(true));
    return () => {
      disposed = true;
      if (onResize) removeEventListener('resize', onResize);
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, [onFrame]);

  const pick = (m: ViewerMode) => {
    setMode(m);
    handleRef.current?.setMode(m);
    track('product_mode_changed', { mode: m });
  };

  const open = (i: number) => {
    setDrawer(i);
    handleRef.current?.setFocus(i);
  };

  return (
    <section className="viewer" aria-label="Interactive DryLah model">
      <canvas ref={canvasRef} data-cursor="Drag" aria-label="3D model of the DryLah base. Drag to rotate. Use the buttons to change view and zoom." role="img" />
      {failed && (
        <div className="stage-fallback">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset('/img/concept-drawing.webp')} alt="Exploded concept drawing of the DryLah base with five numbered parts." />
        </div>
      )}
      <div className="viewer-ui">
        <div className="viewer-title">
          <p className="beat-k">Interactive product</p>
          <h1>Five parts.<br />One base.</h1>
          <p>Drag to rotate. Open a numbered part for the full explanation and its evidence status.</p>
        </div>

        <button type="button" className="ev-toggle" aria-pressed={evidence} onClick={() => { setEvidence((v) => !v); track('evidence_opened'); }}>
          <span className="sw" aria-hidden />Evidence overlay
        </button>

        {components.map((c, i) => (
          <button
            key={c.key}
            type="button"
            className="hotspot"
            ref={(el) => { spotRefs.current[i] = el; }}
            onClick={() => open(i)}
            data-active={drawer === i}
            aria-label={`${c.n}. ${c.title}, ${c.statusLabel}`}
          >
            {c.n}
            <span className="hotspot-tip">{c.title}</span>
            {(evidence || mode === 'exploded') && <Status s={c.status} label={c.status === 'concept' ? 'Concept component' : undefined} />}
          </button>
        ))}

        <div className="modes" role="group" aria-label="View mode">
          {MODES.map((m) => (
            <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => pick(m.id)}>{m.label}</button>
          ))}
        </div>

        <div className="zoom" role="group" aria-label="Zoom">
          <button type="button" aria-label="Zoom in" onClick={() => handleRef.current?.zoom(1)}>+</button>
          <button type="button" aria-label="Zoom out" onClick={() => handleRef.current?.zoom(-1)}>-</button>
          <button type="button" className="reset" aria-label="Reset view" onClick={() => handleRef.current?.resetView()}>Reset</button>
        </div>
      </div>
      <Drawer
        index={drawer}
        onClose={() => { setDrawer(null); handleRef.current?.setFocus(-1); }}
        onStep={(i) => open(i)}
      />
    </section>
  );
}
