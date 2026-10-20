import Link from 'next/link';

import { Comparison } from '@/components/home/Sections';
import { Counter, Eyebrow, SourceTag, Split, Status } from '@/components/site/ui';
import { interviews, testAreas, testingPlan, timeline } from '@/content/research';
import { BarrierDiagram, EggDiagram } from './Viz';

function Limits({ children }: { children: React.ReactNode }) {
  return (
    <div className="limits" data-reveal>
      <span className="panel-k">Research limits</span>
      <p>{children}</p>
    </div>
  );
}

function Sources({ ids }: { ids: string[] }) {
  return (
    <div className="block">
      <div className="panel" data-reveal style={{ display: 'flex', flexWrap: 'wrap', gap: '14px 28px', alignItems: 'center' }}>
        <span className="panel-k" style={{ margin: 0 }}>Sources on this page</span>
        {ids.map((id) => <SourceTag key={id} id={id} />)}
        <Link href="/sources/" className="text-link">All sources</Link>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- 01 context */

export function SingaporeContext() {
  const max = Math.max(...timeline.map((t) => t.value));
  return (
    <>
      <section className="block">
        <div className="block-head">
          <Eyebrow n="01">Cases over time</Eyebrow>
          <Split as="h2" text={['A big year,', 'then a quieter one.']} className="h-lg" />
          <p data-reveal>Annual dengue cases swing widely. A quiet year does not mean the habitats have gone.</p>
        </div>
        <div className="timeline" data-reveal>
          {timeline.map((t) => (
            <div className="tl" key={t.label}>
              <div className="tl-bar"><i style={{ height: `${Math.max(6, (t.value / max) * 100)}%` }} /></div>
              <p className="tl-v">{t.display}</p>
              <p className="tl-l">{t.caption}, {t.label}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 18 }}><SourceTag id="nea-peak-2026" /></div>
      </section>

      <section className="block">
        <div className="block-head">
          <Eyebrow n="02">Habitats</Eyebrow>
          <Split as="h2" text={['Where breeding', 'was actually found.']} className="h-lg" />
        </div>
        <ol className="stats" style={{ marginTop: 0 }}>
          <li className="stat" data-reveal style={{ ['--i' as string]: 0 }}>
            <span className="stat-n">01</span>
            <p className="stat-v"><Counter to={20469} /></p>
            <p className="stat-l">breeding habitats uncovered across about 565,730 inspections in 2025</p>
            <p className="stat-q"><span>Read as</span>All habitat types, not only plant plates</p>
            <SourceTag id="nea-peak-2026" />
          </li>
          <li className="stat" data-reveal style={{ ['--i' as string]: 1 }}>
            <span className="stat-n">02</span>
            <p className="stat-v"><Counter to={65} suffix="%" /></p>
            <p className="stat-l">of detected Aedes breeding in dengue cluster areas during 2025 was in homes</p>
            <p className="stat-q"><span>Read as</span>Habitat share in cluster areas, not share of national cases</p>
            <SourceTag id="nea-peak-2026" />
          </li>
          <li className="stat" data-reveal style={{ ['--i' as string]: 2 }}>
            <span className="stat-n">03</span>
            <p className="stat-v">No. 2</p>
            <p className="stat-l">Flowerpot plates and trays among home breeding habitats in 2023, 2024 and 2025</p>
            <p className="stat-q"><span>Read as</span>Ranking does not show absolute share</p>
            <SourceTag id="nea-sites" />
          </li>
        </ol>
      </section>

      <section className="block">
        <div className="grid-2">
          <div className="panel" data-reveal>
            <span className="panel-k">Scale of the household market</span>
            <p style={{ fontSize: 'var(--t-3)', fontWeight: 900, fontVariationSettings: "'wdth' 125", letterSpacing: '-0.05em', lineHeight: 0.9 }}>1.4871M</p>
            <p style={{ marginTop: 12, color: 'var(--bone-80)' }}>resident households in Singapore in 2025. Not every household keeps potted plants, so this is an upper bound, not a market size.</p>
            <div style={{ marginTop: 16 }}><SourceTag id="singstat-households" /></div>
          </div>
          <Limits>
            Case counts, habitat counts and cluster-area shares describe different populations. They cannot be combined into one causal
            claim, and none of them shows how much dengue flowerpot plates cause. They show that home habitats matter and that plates are a
            recurring one.
          </Limits>
        </div>
      </section>
      <Sources ids={['nea-peak-2026', 'nea-sites', 'singstat-households']} />
    </>
  );
}

/* --------------------------------------------------------- 02 behaviour */

export function HouseholdBehaviour() {
  return (
    <>
      <section className="block">
        <div className="block-head">
          <Eyebrow n="01">Method</Eyebrow>
          <Split as="h2" text={['Twelve households.', 'Prototype in hand.']} className="h-lg" />
          <p data-reveal>Twelve household interviews and prototype feedback. Participants are described only in broad terms. No names, addresses or demographics are published.</p>
        </div>
      </section>

      <section className="block" style={{ paddingTop: 0 }}>
        <ol className="int-list" style={{ marginTop: 0 }}>
          {interviews.map((x, i) => (
            <li className="int" key={x.theme} data-reveal style={{ ['--i' as string]: i }}>
              <div className="int-top"><span className="int-n">0{i + 1}</span><span className="int-theme">{x.theme}</span></div>
              <blockquote className="int-quote"><p>{x.quote}</p></blockquote>
              <p style={{ color: 'var(--bone-60)', marginTop: 10 }}>{x.observation}</p>
              <div className="int-arrow" aria-hidden><svg viewBox="0 0 200 24" preserveAspectRatio="none"><path d="M0 12 H192 M184 4 L194 12 L184 20" /></svg></div>
              <p className="int-k">Design response</p>
              <p className="int-r">{x.response}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="block">
        <div className="block-head">
          <Eyebrow n="02">Before and after feedback</Eyebrow>
          <Split as="h2" text={['What changed', 'in the design.']} className="h-lg" />
        </div>
        <div className="plan">
          {[
            ['A reminder to check plates', 'A passive base that does the job without a reminder'],
            ['A task shared across the household', 'One installed object rather than a shared checklist'],
            ['One tall base for every pot', 'Lower profile, keep existing pots, multiple sizes only after fit evidence'],
            ['Price untested', 'Test S$4.90 and multipacks with real people'],
          ].map(([a, b]) => (
            <div className="plan-row" key={a} data-reveal style={{ gridTemplateColumns: '1fr 40px 1fr' }}>
              <p style={{ color: 'var(--bone-60)' }}>{a}</p>
              <span aria-hidden style={{ color: 'var(--lime)', fontFamily: 'var(--font-mono)' }}>to</span>
              <p style={{ fontWeight: 600 }}>{b}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="block">
        <div className="grid-2">
          <div className="panel" data-reveal>
            <span className="panel-k">Published context</span>
            <div style={{ display: 'flex', gap: 30, flexWrap: 'wrap' }}>
              <div>
                <p className="stat-v" style={{ fontSize: 'var(--t-4)' }}><Counter to={97} suffix="%" /></p>
                <p style={{ color: 'var(--bone-80)', maxWidth: '22ch' }}>recognised stagnant water as supporting breeding</p>
              </div>
              <div>
                <p className="stat-v" style={{ fontSize: 'var(--t-4)', color: 'var(--s-val)' }}><Counter to={36} suffix="%" /></p>
                <p style={{ color: 'var(--bone-80)', maxWidth: '22ch' }}>overall prevention-practice score</p>
              </div>
            </div>
            <p style={{ marginTop: 16, color: 'var(--bone-60)', fontSize: 'var(--t-sm)' }}>Survey of 400 Singapore adults, conducted in 2022 and published in 2026. Context, not proof of DryLah demand.</p>
            <div style={{ marginTop: 14 }}><SourceTag id="ang-2026" /></div>
          </div>
          <Limits>
            Qualitative feedback from 12 interviews does not establish prevalence, market size, purchase conversion or product performance.
            It informed the design direction. It does not validate demand.
          </Limits>
        </div>
      </section>
      <Sources ids={['ang-2026', 'nea-measures']} />
    </>
  );
}

/* --------------------------------------------------------- 03 mechanism */

export function Mechanism() {
  return (
    <>
      <section className="block">
        <div className="block-head">
          <Eyebrow n="01">Aedes egg biology</Eyebrow>
          <Split as="h2" text={['Eggs stick to the wall,', 'not the water.']} accent={['wall,']} className="h-lg" />
          <p data-reveal>Adult female Aedes mosquitoes lay eggs on inner container walls just above the waterline. The eggs adhere strongly and can survive drying, so emptying water alone is not the same as scrubbing the eggs away.</p>
        </div>
        <div className="panel" data-reveal><EggDiagram /></div>
        <div style={{ marginTop: 18 }}><SourceTag id="cdc-lifecycle" /></div>
      </section>

      <section className="block">
        <div className="block-head">
          <Eyebrow n="02">Current guidance</Eyebrow>
          <Split as="h2" text={['Empty and scrub,', 'every other day.']} className="h-lg" />
          <p data-reveal>NEA guidance for flowerpot plates relies on repeated emptying and scrubbing. It works when it is done. Our interviews suggest hidden plates are the ones that get missed.</p>
        </div>
        <SourceTag id="nea-measures" />
      </section>

      <section className="block">
        <div className="block-head">
          <Eyebrow n="03">Barrier logic</Eyebrow>
          <Split as="h2" text={['Four places', 'the barrier must hold.']} accent={['hold.']} className="h-lg" />
          <p data-reveal>A dry-looking top surface is not evidence. The barrier has to work at the mesh, the rim, the wick and the overflow. Any one gap defeats the idea.</p>
        </div>
        <div className="panel" data-reveal><BarrierDiagram /></div>
        <p style={{ marginTop: 14 }}><Status s="concept" label="Concept illustration" /></p>
      </section>

      <section className="block">
        <div className="grid-2">
          <div className="panel" data-reveal>
            <span className="panel-k">Unanswered questions</span>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--bone-80)' }}>
              <li>Can an adult mosquito pass the mesh, rim or overflow under real conditions?</li>
              <li>Does a wet wick create a path to the water?</li>
              <li>What happens to eggs already on the reservoir walls?</li>
              <li>How quickly do debris and soil fines block the mesh?</li>
            </ul>
          </div>
          <Limits>
            Mosquito exclusion has not been tested. It must not be tested with an open household experiment. Any exclusion test needs a protocol
            defined or reviewed by a qualified partner in a controlled setting.
          </Limits>
        </div>
      </section>
      <Sources ids={['cdc-lifecycle', 'nea-measures']} />
    </>
  );
}

/* ------------------------------------------------------ 04 alternatives */

export function Alternatives() {
  const opts = [
    { t: 'No saucer', d: 'Free, and the right answer wherever drainage can run away safely. Not always possible indoors or on balconies.' },
    { t: 'Ordinary saucer with NEA care', d: 'Works when emptied and scrubbed every other day. The burden is the repeated task.' },
    { t: 'Wick tray', d: 'Catches drainage and returns moisture. Does not keep the stored water covered.', src: 'tumbleweed-wick' },
    { t: 'IKEA SVÄMSKOG insert', d: 'Self-watering insert with an insect-covering lid, listed at S$4.90. Replaces the pot setup rather than sitting under your own.', src: 'ikea-svamskog' },
    { t: 'DryLah! concept', d: 'A covered base under the pot you already own, with a mesh, a wick and a screened overflow. Every performance claim still needs testing.' },
  ];
  return (
    <>
      <section className="block">
        <div className="block-head">
          <Eyebrow n="01">The options</Eyebrow>
          <Split as="h2" text={['We are not', 'the first idea.']} className="h-lg" />
          <p data-reveal>Wicks and lids already exist. DryLah! has to earn its place as a whole base, and for many homes the free option is better.</p>
        </div>
        <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {opts.map((o, i) => (
            <div className="panel" key={o.t} data-reveal style={i === opts.length - 1 ? { boxShadow: 'inset 0 2px 0 var(--lime)' } : undefined}>
              <span className="panel-k">0{i + 1}</span>
              <h3 style={{ fontSize: 'var(--t-2)', fontWeight: 800, fontVariationSettings: "'wdth' 116", letterSpacing: '-0.03em', marginBottom: 10 }}>{o.t}</h3>
              <p style={{ color: 'var(--bone-80)' }}>{o.d}</p>
              {o.src && <div style={{ marginTop: 14 }}><SourceTag id={o.src} /></div>}
            </div>
          ))}
        </div>
      </section>
      <div style={{ marginLeft: 'calc(var(--gutter) * -1)', marginRight: 'calc(var(--gutter) * -1)' }}>
        <Comparison />
      </div>
      <section className="block">
        <Limits>Prices and listings change and must be rechecked before public launch. We do not claim DryLah! is the only or first solution.</Limits>
      </section>
      <Sources ids={['ikea-svamskog', 'tumbleweed-wick', 'nea-measures']} />
    </>
  );
}

/* ----------------------------------------------------------- 05 testing */

export function Testing() {
  return (
    <>
      <section className="block">
        <div className="block-head">
          <Eyebrow n="01">Five test areas</Eyebrow>
          <Split as="h2" text={['What has to be true', 'before we say more.']} className="h-lg" />
        </div>
        <ol className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {testAreas.map((a, i) => (
            <li className="panel" key={a.title} data-reveal>
              <span className="panel-k">0{i + 1}</span>
              <h3 style={{ fontSize: 'var(--t-1)', fontWeight: 800, fontVariationSettings: "'wdth' 116", marginBottom: 8 }}>{a.title}</h3>
              <p style={{ color: 'var(--bone-80)' }}>{a.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="block">
        <div className="block-head">
          <Eyebrow n="02">Six-week plan</Eyebrow>
          <Split as="h2" text={['Three stages.', 'Three gates.']} accent={['gates.']} className="h-lg" />
        </div>
        <div className="plan">
          {testingPlan.map((r) => (
            <div className="plan-row" key={r.when} data-reveal>
              <p className="plan-when">{r.when}</p>
              <div><h4>Activity</h4><p>{r.activity}</p></div>
              <div className="plan-gate"><h4>Gate</h4><p>{r.gate}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="block">
        <div className="block-head">
          <Eyebrow n="03">Success language</Eyebrow>
          <Split as="h2" text={['Failure is useful.', 'Spin is not.']} className="h-lg" />
          <p data-reveal>A failed gate triggers a redesign: lower profile, different mesh, a sealed overflow or dropping the wick. Repeated failure on exclusion means a pivot, not a marketing line.</p>
        </div>
        <div className="grid-3">
          <div className="panel" data-reveal><Status s="demonstrated" label="Pass" size="lg" /><p style={{ marginTop: 14, color: 'var(--bone-80)' }}>The assembly met the defined test condition.</p></div>
          <div className="panel" data-reveal><Status s="validate" label="Fail" size="lg" /><p style={{ marginTop: 14, color: 'var(--bone-80)' }}>The assembly exposed water, blocked, leaked, destabilised the pot or created unreasonable cleaning burden.</p></div>
          <div className="panel" data-reveal><Status s="proposed" label="Inconclusive" size="lg" /><p style={{ marginTop: 14, color: 'var(--bone-80)' }}>The method or sample was insufficient. An inconclusive result never becomes a marketing claim.</p></div>
        </div>
      </section>

      <section className="block">
        <div className="limits" data-reveal>
          <span className="panel-k">Safety rule: no open household mosquito experiment</span>
          <p>We do not intentionally breed or attract mosquitoes at home. Drainage and overflow can be bench-tested without mosquitoes. Any exclusion test must follow a protocol defined or reviewed by a qualified partner in an appropriate controlled setting.</p>
        </div>
        <div style={{ marginTop: 30 }}>
          <Link href="/order/?type=testing" className="text-link">Offer testing support</Link>
        </div>
      </section>
    </>
  );
}
