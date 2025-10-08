import { useEffect, useRef } from 'react';
import { phaseColors } from '../utils/breathUtils';

export default function BreathVisualizer({ phase, progress, reducedMotion }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const tRef = useRef(0);

  const colorRef = useRef(phaseColors.inhale);
  const targetColorRef = useRef(phaseColors.inhale);
  const baseAngleRef = useRef(0);
  const dirRef = useRef(1);
  const pulseRef = useRef(0);

  const audioCtxRef = useRef(null);
  const noiseGainRef = useRef(null);
  const noiseLPFRef = useRef(null);
  const ensureAudio = () => {
    if (audioCtxRef.current) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const len = 2 * ctx.sampleRate;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const ch = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = 0.98 * last + 0.02 * w; ch[i] = last; }
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 500;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(lpf); lpf.connect(g); g.connect(ctx.destination); src.start();
      audioCtxRef.current = ctx; noiseGainRef.current = g; noiseLPFRef.current = lpf;
    } catch {}
  };
  const setAudioTargets = (gainT, cutoffT) => {
    const ctx = audioCtxRef.current, g = noiseGainRef.current, f = noiseLPFRef.current;
    if (!ctx || !g || !f) return;
    const now = ctx.currentTime;
    g.gain.cancelScheduledValues(now); f.frequency.cancelScheduledValues(now);
    g.gain.setTargetAtTime(gainT, now, 0.25);
    f.frequency.setTargetAtTime(cutoffT, now, 0.25);
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const mixRGBA = (from, to, k) => {
    const pa = from.match(/\d+/g).map(Number), pb = to.match(/\d+/g).map(Number);
    return `rgb(${Math.round(lerp(pa[0], pb[0], k))},${Math.round(lerp(pa[1], pb[1], k))},${Math.round(lerp(pa[2], pb[2], k))})`;
  };
  const withAlpha = (rgb, a) => rgb.replace('rgb', 'rgba').replace(')', `, ${a})`);
  const easeInOut = (t) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t, 0, 1));
  const smoothstep = (x) => x * x * (3 - 2 * x);
  const phaseFullness = (ph, prog) => {
    if (ph === 'inhale') return prog;
    if (ph === 'hold') return 1;
    if (ph === 'exhale') return 1 - prog;
    return 0;
  };

  const ringStartRef = useRef(-Math.PI / 2);
  const ringSweepRef = useRef(0);
  const ringStartTRef = useRef(-Math.PI / 2);
  const ringSweepTRef = useRef(0);

  useEffect(() => {
    targetColorRef.current = phaseColors[phase] || phaseColors.rest;
    if (phase === 'hold') {
      targetColorRef.current = phaseColors.hold;
    } else if (phase === 'exhale') {
      targetColorRef.current = 'rgb(255, 255, 255)';
    }

    const fullSweep = 2 * Math.PI;

    if (phase === 'inhale') {
      dirRef.current = 1;
      ringStartTRef.current = -Math.PI / 2;
      ringSweepTRef.current = lerp(0, fullSweep, easeInOut(progress));
      setAudioTargets(0.014, 1400);
    } else if (phase === 'exhale') {
      dirRef.current = -1;
      ringStartTRef.current = -Math.PI / 2;
      ringSweepTRef.current = lerp(0, fullSweep, 1 - easeInOut(progress));
      setAudioTargets(0.012, 900);
    } else if (phase === 'hold') {
      const rot = fullSweep * easeInOut(progress);
      ringStartTRef.current = -Math.PI / 2 + rot;
      ringSweepTRef.current = fullSweep;
      setAudioTargets(0.005, 700);
    } else if (phase === 'rest') {
      const rot = -fullSweep * easeInOut(progress);
      ringStartTRef.current = -Math.PI / 2 + rot;
      ringSweepTRef.current = 0;
      setAudioTargets(0.001, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, progress]);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const onR = () => {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const p = c.parentElement || document.body;
      const s = Math.min(p.clientWidth, p.clientHeight || p.clientWidth);
      c.width = Math.max(1, Math.floor(s * dpr)); c.height = Math.max(1, Math.floor(s * dpr));
      c.style.width = `${s}px`; c.style.height = `${s}px`;
    };
    window.addEventListener('resize', onR); onR();
    return () => window.removeEventListener('resize', onR);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });

    const linesCount = Math.min(50, reducedMotion ? 25 : 40);
    const polygonSides = 6;

    let last = performance.now();
    const loop = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      tRef.current += dt;

      colorRef.current = mixRGBA(colorRef.current, targetColorRef.current, 0.06);
      const color = colorRef.current;

      const cw = canvas.width, ch = canvas.height;
      const cx = cw / 2, cy = ch / 2;

      const fullness = phaseFullness(phase, progress);
      const baseR = Math.min(cx, cy) * 0.44;
      let scale = reducedMotion ? (0.91 + fullness * 0.09) : (0.8 + fullness * 0.24);

      if (phase === 'exhale') {
        scale = lerp(1, 0.05, easeInOut(progress));
      } else if (phase === 'rest') {
        scale = 0.05;
      }

      const pu = pulseRef.current; pulseRef.current = Math.max(0, pu - dt * 0.8);
      const pulseAdd = (reducedMotion ? 0.03 : 0.05) * smoothstep(pu);

      const wob = Math.sin(tRef.current * 0.55) * 0.35 + Math.sin(tRef.current * 1.1 + 1.7) * 0.15;
      const omega = (reducedMotion ? 0.22 : 0.3) * Math.PI;
      baseAngleRef.current += omega * dt * (phase === 'inhale' ? 1 : phase === 'exhale' ? -1 : dirRef.current);
      const baseAngle = baseAngleRef.current + wob * 0.03 + pulseAdd * 0.12 * dirRef.current;

      const k = Math.min(1, Math.max(0, 7 * dt));
      ringStartRef.current = ringStartRef.current + (ringStartTRef.current - ringStartRef.current) * k;
      ringSweepRef.current = ringSweepRef.current + (ringSweepTRef.current - ringSweepRef.current) * k;
      const ringStart = ringStartRef.current, ringSweep = ringSweepRef.current;

      ctx.clearRect(0, 0, cw, ch);

      // inner orb
      const orbR = baseR * (scale + pulseAdd);
      ctx.save();
      const grad = ctx.createRadialGradient(cx, cy, orbR * 0.15, cx, cy, orbR);
      grad.addColorStop(0, withAlpha(color, reducedMotion ? 0.22 : 0.3));
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, orbR, 0, Math.PI * 2); ctx.fill();

      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowColor = color; 
      ctx.shadowBlur = reducedMotion ? 0 : orbR * (phase === 'exhale' || phase === 'rest' ? 0.8 : 0.25);
      ctx.beginPath(); ctx.arc(cx, cy, orbR * 0.82, 0, Math.PI * 2);
      ctx.fillStyle = withAlpha(color, 0.05); ctx.fill();
      ctx.restore();

      // geometric line-art
      if (!(phase === 'exhale' && progress > 0.9) && phase !== 'rest') {
        ctx.save(); ctx.translate(cx, cy);
        const innerR = orbR * 0.18;
        const lineW = Math.max(0.8, Math.min(2.2, orbR * 0.008));
        const rotStep = (Math.PI / 36) * 0.95;
        for (let i = 0; i < linesCount; i++) {
          const t = i / (linesCount - 1 || 1);
          const r = ((1 - t) * innerR) + (t * orbR * 0.98);
          const a = baseAngle + rotStep * i + Math.sin(tRef.current * 0.2 + i * 0.1) * 0.1;
          const eccY = 1 - (0.05 + 0.04 * Math.sin(tRef.current * 0.45 + i)) * (0.6 + 0.4 * fullness);
          ctx.save(); ctx.rotate(a); ctx.scale(1, eccY);
          ctx.beginPath();
          for (let k2 = 0; k2 < polygonSides; k2++) {
            const ang = (k2 / polygonSides) * Math.PI * 2;
            const x = Math.cos(ang) * r, y = Math.sin(ang) * r;
            if (k2 === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.closePath();
          const aRamp = ((1 - t) * 0.15) + (t * 0.5);
          ctx.strokeStyle = withAlpha(color, aRamp);
          ctx.lineWidth = lineW; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.stroke(); ctx.restore();
        }
        ctx.restore();
      }

      // outer progress ring
      const ringR = baseR * (reducedMotion ? 1.35 : 1.55);
      const ringWidth = ringR * (reducedMotion ? 0.03 : 0.035);
      const uiBaseWidth = ringR * (reducedMotion ? 0.025 : 0.028);

      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = withAlpha('rgb(255,255,255)', 0.08);
      ctx.lineWidth = uiBaseWidth; ctx.stroke();

      const pulseColorA = (phase === 'hold' || phase === 'rest')
        ? (0.75 + 0.25 * Math.sin(tRef.current * 2.6)) * (reducedMotion ? 0.55 : 0.85)
        : (reducedMotion ? 0.6 : 0.9);

      ctx.beginPath();
      ctx.arc(cx, cy, ringR, ringStart, ringStart + ringSweep, false);
      ctx.strokeStyle = withAlpha(color, pulseColorA);
      ctx.lineWidth = ringWidth; ctx.lineCap = 'round'; ctx.stroke();

      const end = ringStart + ringSweep;
      const ex = cx + Math.cos(end) * ringR, ey = cy + Math.sin(end) * ringR;
      ctx.beginPath(); ctx.arc(ex, ey, Math.max(1.2, ringWidth * 1.5), 0, Math.PI * 2);
      ctx.fillStyle = withAlpha(color, pulseColorA);
      ctx.shadowColor = color;
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.restore();

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, progress, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      onPointerDown={() => { try { ensureAudio(); audioCtxRef.current && audioCtxRef.current.resume(); } catch {} }}
    />
  );
}