import { useEffect, useRef } from 'react';

const THREE_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js';
const VANTA_FOG_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/vanta/0.5.24/vanta.fog.min.js';

const scriptCache = new Map();

const loadScript = (src) => {
  if (typeof window === 'undefined') return Promise.resolve();
  if (scriptCache.has(src)) return scriptCache.get(src);

  const promise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', resolve);
      existing.addEventListener('error', reject);
      if (existing.readyState === 'complete') resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });

  scriptCache.set(src, promise);
  return promise;
};

export default function AuroraBackground({ reducedMotion = false }) {
  const containerRef = useRef(null);
  const effectRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    let cancelled = false;

    const initVanta = async () => {
      if (reducedMotion || cancelled || !containerRef.current) return;

      try {
        if (!window.THREE) await loadScript(THREE_SRC);
        if (!window.VANTA || !window.VANTA.FOG) await loadScript(VANTA_FOG_SRC);
        if (cancelled || !containerRef.current || !window.VANTA?.FOG) return;

        effectRef.current = window.VANTA.FOG({
          el: containerRef.current,
          mouseControls: false,
          touchControls: false,
          gyroControls: false,
          highlightColor: 0x91b8ff,
          midtoneColor: 0x152032,
          lowlightColor: 0x05070d,
          baseColor: 0x010106,
          blurFactor: 0.65,
          speed: 0.5,
          zoom: 0.9,
          minHeight: 200,
          minWidth: 200
        });
      } catch (err) {
        if (import.meta?.env?.DEV) {
          // eslint-disable-next-line no-console
          console.warn('Vanta fog background failed to load', err);
        }
      }
    };

    initVanta();

    return () => {
      cancelled = true;
      if (effectRef.current) {
        try { effectRef.current.destroy(); } catch {}
        effectRef.current = null;
      }
    };
  }, [reducedMotion]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 -z-10 overflow-hidden bg-[#05070d]"
      aria-hidden
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_-10%,rgba(90,149,255,0.22),transparent_55%),radial-gradient(circle_at_80%_10%,rgba(16,185,129,0.18),transparent_60%),radial-gradient(circle_at_50%_110%,rgba(99,102,241,0.19),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-black/65 to-black/85" />
    </div>
  );
}
