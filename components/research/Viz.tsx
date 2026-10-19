/* Small hand-drawn SVG diagrams for the research pages and cards. */

export function EggDiagram() {
  return (
    <svg className="diagram" viewBox="0 0 520 300" role="img" aria-label="Cross-section of a container wall. Eggs sit on the inner wall just above the waterline.">
      <defs>
        <linearGradient id="wtr" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#7fe3e0" stopOpacity="0.35" />
          <stop offset="1" stopColor="#0d4a52" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <path d="M60 30 V250 Q60 270 80 270 H440 Q460 270 460 250 V30" fill="none" stroke="rgba(237,241,230,0.5)" strokeWidth="2" />
      <rect x="62" y="170" width="396" height="98" fill="url(#wtr)" />
      <path d="M62 170 H458" stroke="#7fe3e0" strokeWidth="1.5" strokeDasharray="5 4" />
      {Array.from({ length: 9 }).map((_, i) => (
        <ellipse key={i} cx={70 + (i % 2) * 5} cy={128 + i * 4.6} rx="3.2" ry="1.6" fill="#edf1e6" transform={`rotate(-70 ${70 + (i % 2) * 5} ${128 + i * 4.6})`} />
      ))}
      {Array.from({ length: 7 }).map((_, i) => (
        <ellipse key={`r${i}`} cx={450 - (i % 2) * 5} cy={136 + i * 4.6} rx="3.2" ry="1.6" fill="#edf1e6" transform={`rotate(70 ${450 - (i % 2) * 5} ${136 + i * 4.6})`} />
      ))}
      <path d="M86 140 H210" stroke="#b5e655" strokeWidth="1" />
      <circle cx="86" cy="140" r="3" fill="#b5e655" />
      <text x="216" y="144">Eggs above the waterline</text>
      <path d="M300 170 V210 H330" stroke="#7fe3e0" strokeWidth="1" />
      <text x="336" y="214">Waterline</text>
      <text x="62" y="22">Container wall</text>
      <text x="62" y="292">Eggs adhere and can survive drying</text>
    </svg>
  );
}

export function BarrierDiagram() {
  const pts = [
    { x: 260, y: 92, l: 'Mesh', tx: 300, ty: 40 },
    { x: 92, y: 104, l: 'Rim seal', tx: 20, ty: 40 },
    { x: 260, y: 150, l: 'Wick path', tx: 300, ty: 252 },
    { x: 440, y: 168, l: 'Overflow', tx: 400, ty: 252 },
  ];
  return (
    <svg className="diagram" viewBox="0 0 520 280" role="img" aria-label="Cross-section of the DryLah base marking the four places the barrier must hold: mesh, rim seal, wick path and overflow.">
      <path d="M180 20 L200 80 H320 L340 20" fill="rgba(224,122,67,0.25)" stroke="#e07a43" strokeWidth="1.5" />
      <rect x="80" y="84" width="360" height="10" fill="#1d6150" stroke="rgba(181,230,85,0.5)" />
      <path d="M86 98 H434" stroke="rgba(237,241,230,0.7)" strokeDasharray="2 2" />
      <path d="M70 100 V210 Q70 222 82 222 H438 Q450 222 450 210 V100" fill="rgba(29,97,80,0.35)" stroke="rgba(181,230,85,0.5)" strokeWidth="1.5" />
      <rect x="72" y="170" width="376" height="50" fill="rgba(127,227,224,0.22)" />
      <rect x="252" y="60" width="16" height="150" fill="#ece4d2" opacity="0.85" />
      <rect x="446" y="150" width="8" height="34" fill="none" stroke="#edf1e6" strokeDasharray="2 2" />
      {pts.map((p, i) => (
        <g key={p.l}>
          <line x1={p.x} y1={p.y} x2={p.tx + 4} y2={p.ty - 4} stroke="#b5e655" strokeWidth="1" />
          <circle cx={p.x} cy={p.y} r="11" fill="#030805" stroke="#b5e655" />
          <text x={p.x} y={p.y + 4} textAnchor="middle" style={{ fill: '#b5e655' }}>{i + 1}</text>
          <text x={p.tx} y={p.ty}>{p.l}</text>
        </g>
      ))}
    </svg>
  );
}

/** Background art for the research hub cards. */
export function CardViz({ kind }: { kind: string }) {
  if (kind === 'singapore-dengue') {
    return (
      <svg className="r-card-viz" viewBox="0 0 400 300" preserveAspectRatio="xMaxYMax slice" aria-hidden>
        {[200, 70, 18].map((h, i) => (
          <rect key={i} x={250 + i * 46} y={290 - h} width="34" height={h} fill="none" stroke="rgba(181,230,85,0.5)" />
        ))}
      </svg>
    );
  }
  if (kind === 'household-behaviour') {
    return (
      <svg className="r-card-viz" viewBox="0 0 400 300" preserveAspectRatio="xMaxYMax slice" aria-hidden>
        {Array.from({ length: 12 }).map((_, i) => (
          <circle key={i} cx={240 + (i % 4) * 40} cy={140 + Math.floor(i / 4) * 40} r="12" fill="none" stroke="rgba(181,230,85,0.5)" />
        ))}
      </svg>
    );
  }
  if (kind === 'mechanism') {
    return (
      <svg className="r-card-viz" viewBox="0 0 400 300" preserveAspectRatio="xMaxYMax slice" aria-hidden>
        <path d="M250 120 V260 H380 V120" fill="none" stroke="rgba(181,230,85,0.5)" />
        <path d="M250 210 H380" stroke="rgba(127,227,224,0.6)" strokeDasharray="4 4" />
        {Array.from({ length: 6 }).map((_, i) => <circle key={i} cx={256} cy={180 + i * 4} r="2" fill="rgba(237,241,230,0.6)" />)}
      </svg>
    );
  }
  if (kind === 'alternatives') {
    return (
      <svg className="r-card-viz" viewBox="0 0 400 300" preserveAspectRatio="xMaxYMax slice" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <rect key={i} x={230 + i * 30} y={170} width="20" height="20" fill={i === 4 ? 'rgba(181,230,85,0.6)' : 'none'} stroke="rgba(181,230,85,0.5)" />
        ))}
      </svg>
    );
  }
  return (
    <svg className="r-card-viz" viewBox="0 0 400 300" preserveAspectRatio="xMaxYMax slice" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <rect key={i} x={200 + i * 30} y={160} width="22" height="80" fill="none" stroke={i < 2 ? 'rgba(181,230,85,0.7)' : 'rgba(237,241,230,0.25)'} />
      ))}
    </svg>
  );
}
