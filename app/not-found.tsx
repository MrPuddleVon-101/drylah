import { Btn } from '@/components/site/ui';

export default function NotFound() {
  return (
    <div className="page">
      <header className="page-head" style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <p className="eyebrow"><span className="eyebrow-n">404</span><span className="eyebrow-rule" aria-hidden /><span>Page not found</span></p>
        <h1 className="h-xl">Nothing here.<br /><span style={{ color: 'var(--lime)' }}>Not even water.</span></h1>
        <div style={{ marginTop: 40 }}><Btn href="/">Back to the base</Btn></div>
      </header>
    </div>
  );
}
