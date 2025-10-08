import { useMemo } from 'react';

export default function GeometricBackground({
  variant = 'rose',
  primary = 'rgb(163, 230, 216)',
  opacity = 0.7,
  className = '',
}) {
  const withA = (rgb, a) => rgb.replace('rgb', 'rgba').replace(')', `, ${a})`);

  const lines = useMemo(() => {
    if (variant !== 'lines') return [];
    const arr = [];
    const w = 1000, h = 1000, step = 26;
    for (let y = -100; y <= h + 100; y += step) {
      const p = (y / h) * Math.PI * 2;
      const y0 = y + Math.sin(p) * 40;
      const y1 = y + Math.sin(p + Math.PI * 0.33) * 32;
      const y2 = y + Math.sin(p + Math.PI * 0.66) * 24;
      arr.push(`M0 ${y0} C 250 ${y1}, 750 ${y2}, 1000 ${y0}`);
    }
    return arr;
  }, [variant]);

  return (
    <div className={`absolute inset-0 z-0 pointer-events-none select-none ${className}`}>
      <svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
        <defs>
          <radialGradient id="bgSoft" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor={withA(primary, 0.18 * opacity)} />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <radialGradient id="petal" cx="50%" cy="50%" r="100%">
            <stop offset="0%" stopColor={withA(primary, 0.16 * opacity)} />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <filter id="blur8"><feGaussianBlur stdDeviation="8" /></filter>
          <filter id="blur20"><feGaussianBlur stdDeviation="20" /></filter>
        </defs>

        <rect width="100%" height="100%" fill="url(#bgSoft)" />

        {variant === 'rose' && (
          <g transform="translate(500,500)" style={{ mixBlendMode: 'screen' }}>
            <circle cx="0" cy="0" r="430" fill="url(#bgSoft)" filter="url(#blur20)" />
            {Array.from({ length: 12 }).map((_, i) => {
              const a = (i / 12) * Math.PI * 2;
              const px = Math.cos(a) * 170;
              const py = Math.sin(a) * 170;
              return <circle key={i} cx={px} cy={py} r="420" fill="url(#petal)" filter="url(#blur8)" />;
            })}
          </g>
        )}

        {variant === 'lattice' && (
          <g transform="translate(500,500)" style={{ mixBlendMode: 'screen' }}>
            {(() => {
              const r = 320;
              const centers = [[0,0]];
              for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2;
                centers.push([Math.cos(a) * r * 0.87, Math.sin(a) * r * 0.87]);
              }
              return centers.map(([x,y], idx) => (
                <g key={idx} filter="url(#blur8)">
                  <circle cx={x} cy={y} r={r} fill="none" stroke={withA(primary, 0.18 * opacity)} strokeWidth="2.2" />
                  <circle cx={x} cy={y} r={r*0.66} fill="none" stroke={withA(primary, 0.12 * opacity)} strokeWidth="1.6" />
                </g>
              ));
            })()}
          </g>
        )}

        {variant === 'lines' && (
          <g style={{ mixBlendMode: 'screen' }}>
            {lines.map((d, i) => (
              <path key={i} d={d} fill="none" stroke={withA(primary, 0.11 * opacity)} strokeWidth="2" filter="url(#blur8)" />
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}