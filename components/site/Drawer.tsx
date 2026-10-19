'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

import { components } from '@/content/product';
import { Status, track } from './ui';

/** Full hotspot copy, opened from a label or the component list. */
export function Drawer({ index, onClose, onStep }: { index: number | null; onClose: () => void; onStep?: (i: number) => void }) {
  const open = index !== null;
  const c = open ? components[index] : null;
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    track('component_opened', { component: components[index!].key });
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && onStep) onStep(Math.min(4, index! + 1));
      if (e.key === 'ArrowLeft' && onStep) onStep(Math.max(0, index! - 1));
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open, index, onClose, onStep]);

  return (
    <div className="drawer" data-open={open} aria-hidden={!open}>
      <button type="button" className="drawer-scrim" aria-label="Close" tabIndex={-1} onClick={onClose} />
      <aside className="drawer-panel" role="dialog" aria-modal="true" aria-label={c?.title ?? 'Component'}>
        {c && (
          <>
            <div className="drawer-head">
              <span className="drawer-n">{String(c.n).padStart(2, '0')}<small>/05</small></span>
              <button ref={closeRef} type="button" className="drawer-close" onClick={onClose} data-cursor="Close">Close</button>
            </div>
            <h3 className="drawer-title">{c.title}</h3>
            <Status s={c.status} label={c.statusLabel} size="lg" />
            <p className="drawer-short">{c.short}</p>
            <p className="drawer-long">{c.long}</p>
            <div className="drawer-foot">
              {onStep && (
                <div className="drawer-steps">
                  <button type="button" disabled={c.n === 1} onClick={() => onStep(index! - 1)} aria-label="Previous component">Prev</button>
                  <button type="button" disabled={c.n === 5} onClick={() => onStep(index! + 1)} aria-label="Next component">Next</button>
                </div>
              )}
              <Link href="/research/testing/" className="drawer-link">How we will test this</Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
