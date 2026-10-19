'use client';

import { useEffect, useState } from 'react';

import { Status, track } from '@/components/site/ui';

/**
 * No-payment interest form (PRD section 10). There is no card field, no
 * payment SDK and no delivery promise anywhere in this component.
 *
 * Set NEXT_PUBLIC_INTEREST_ENDPOINT to a form backend (spreadsheet webhook,
 * Formspree, etc.) and responses are POSTed there as JSON. Without it the
 * form runs in a clearly labelled demo mode and says it did not save.
 */
const ENDPOINT = process.env.NEXT_PUBLIC_INTEREST_ENDPOINT ?? '';

const DIAMETERS = ['Under 12 cm', '12 to 16 cm', '17 to 22 cm', 'Above 22 cm', 'Unsure'];
const QTY = ['1', '2', '3 to 5', '6+'];
const PRICE = ['Feels low', 'Feels fair', 'Feels high', 'Unsure'];
const TYPES = [
  { id: 'pilot', label: 'Household pilot' },
  { id: 'order', label: 'Future order' },
  { id: 'nursery', label: 'Nursery conversation' },
  { id: 'testing', label: 'Testing support' },
];

type Errors = Partial<Record<string, string>>;

export function InterestForm() {
  const [type, setType] = useState('pilot');
  const [diam, setDiam] = useState<string[]>([]);
  const [state, setState] = useState<'idle' | 'sending' | 'ok' | 'demo' | 'error'>('idle');
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    const t = new URLSearchParams(location.search).get('type');
    if (t && TYPES.some((x) => x.id === t)) setType(t);
    track('order_started');
  }, []);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const err: Errors = {};
    const name = String(fd.get('name') ?? '').trim();
    const email = String(fd.get('email') ?? '').trim();
    const pots = Number(fd.get('pots'));
    if (!name) err.name = 'Please add your name.';
    if (!/^\S+@\S+\.\S+$/.test(email)) err.email = 'Please add a valid email.';
    if (!pots || pots < 1) err.pots = 'Roughly how many pots? Any number from 1.';
    if (!diam.length) err.diam = 'Pick at least one size, or Unsure.';
    if (!fd.get('qty')) err.qty = 'Pick a likely quantity.';
    if (!fd.get('price')) err.price = 'Tell us how S$4.90 feels.';
    if (!fd.get('consent')) err.consent = 'We need your permission to contact you.';
    setErrors(err);
    if (Object.keys(err).length) {
      document.querySelector<HTMLElement>(`[name="${Object.keys(err)[0] === 'diam' ? 'diam' : Object.keys(err)[0]}"]`)?.focus();
      return;
    }

    track('partner_interest_selected', { type });
    const payload = {
      name, email,
      postal: String(fd.get('postal') ?? '').trim(),
      pots, diameters: diam, quantity: fd.get('qty'), price: fd.get('price'), type,
      comments: String(fd.get('comments') ?? '').trim(),
      consent: true, submittedAt: new Date().toISOString(),
    };

    if (!ENDPOINT) {
      setState('demo');
      track('order_submitted', { mode: 'demo', type });
      return;
    }
    setState('sending');
    try {
      const res = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(String(res.status));
      setState('ok');
      track('order_submitted', { mode: 'live', type });
    } catch {
      setState('error');
    }
  };

  if (state === 'ok' || state === 'demo') {
    return (
      <div className="success" role="status">
        <h2>{state === 'ok' ? 'Thanks. You are on the list.' : 'Thanks for trying the form.'}</h2>
        {state === 'ok' ? (
          <p>Thanks. You are on the DryLah! interest list. We will only contact you about testing or future availability.</p>
        ) : (
          <p>This site is running in demo mode, so your response was <strong>not saved</strong>. When the team connects a form backend, submissions will be stored and you will be contacted only about testing or future availability.</p>
        )}
        <Status s="validate" label="No payment taken. Not a confirmed order." />
      </div>
    );
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <fieldset className="field">
        <legend>I am interested in<span className="req">*</span></legend>
        <div className="chips">
          {TYPES.map((t) => (
            <label className="chip" key={t.id}>
              <input type="radio" name="type" value={t.id} checked={type === t.id} onChange={() => setType(t.id)} />
              <span>{t.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="name">Name<span className="req">*</span></label>
          <input id="name" name="name" className="input" autoComplete="name" aria-invalid={!!errors.name} aria-describedby={errors.name ? 'e-name' : undefined} />
          {errors.name && <p className="err" id="e-name">{errors.name}</p>}
        </div>
        <div className="field">
          <label htmlFor="email">Email<span className="req">*</span></label>
          <input id="email" name="email" type="email" className="input" autoComplete="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? 'e-email' : undefined} />
          {errors.email && <p className="err" id="e-email">{errors.email}</p>}
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="postal">Postal sector</label>
          <input id="postal" name="postal" className="input" inputMode="numeric" maxLength={2} placeholder="First two digits" />
          <p className="hint">Optional. We never ask for a full address.</p>
        </div>
        <div className="field">
          <label htmlFor="pots">Number of plant pots<span className="req">*</span></label>
          <input id="pots" name="pots" type="number" min={1} max={500} className="input" aria-invalid={!!errors.pots} />
          {errors.pots && <p className="err">{errors.pots}</p>}
        </div>
      </div>

      <fieldset className="field">
        <legend>Common pot diameter<span className="req">*</span></legend>
        <div className="chips">
          {DIAMETERS.map((d) => (
            <label className="chip" key={d}>
              <input type="checkbox" name="diam" value={d} checked={diam.includes(d)} onChange={(e) => setDiam((v) => (e.target.checked ? [...v, d] : v.filter((x) => x !== d)))} />
              <span>{d}</span>
            </label>
          ))}
        </div>
        {errors.diam && <p className="err">{errors.diam}</p>}
      </fieldset>

      <fieldset className="field">
        <legend>Likely quantity<span className="req">*</span></legend>
        <div className="chips">
          {QTY.map((q) => (
            <label className="chip" key={q}><input type="radio" name="qty" value={q} /><span>{q}</span></label>
          ))}
        </div>
        {errors.qty && <p className="err">{errors.qty}</p>}
      </fieldset>

      <fieldset className="field">
        <legend>The target price is S$4.90. It<span className="req">*</span></legend>
        <div className="chips">
          {PRICE.map((q) => (
            <label className="chip" key={q}><input type="radio" name="price" value={q} /><span>{q}</span></label>
          ))}
        </div>
        {errors.price && <p className="err">{errors.price}</p>}
      </fieldset>

      <div className="field">
        <label htmlFor="comments">Comments</label>
        <textarea id="comments" name="comments" className="input" placeholder="Fit, cleaning, plant types, anything we should know" />
      </div>

      <div className="consent">
        <input id="consent" name="consent" type="checkbox" aria-invalid={!!errors.consent} />
        <label htmlFor="consent">I agree that the DryLah! team may contact me about this project. My details are not shared or sold.</label>
      </div>
      {errors.consent && <p className="err">{errors.consent}</p>}

      <div className="form-submit">
        <button type="submit" className="btn" data-v="primary" disabled={state === 'sending'} data-magnetic>
          <span className="btn-fill" aria-hidden />
          <span className="btn-text">{state === 'sending' ? 'Sending' : 'Register my interest'}</span>
          <svg className="btn-arrow" viewBox="0 0 14 14" aria-hidden><path d="M1 7 H12 M7.5 2.5 L12 7 L7.5 11.5" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
        </button>
        <p>No payment is taken. No delivery date is promised.</p>
      </div>
      {state === 'error' && <p className="err" role="alert">We could not save your response. Please try again or contact the team.</p>}
    </form>
  );
}
