import { useMemo } from 'react';
import { motion } from 'motion/react';
import { phaseColors, phaseGradientTheme, rgbToArr, clamp } from '../utils/breathUtils';

const PHASE_SEQUENCE = ['inhale', 'hold', 'exhale', 'rest'];

const PETAL_COUNT = 12;
const PETAL_LAYERS = [
  { scale: 1, opacity: 0.48, offset: 0 },
  { scale: 0.88, opacity: 0.32, offset: 7.5 },
  { scale: 0.72, opacity: 0.2, offset: 15 }
];

const PETALS = PETAL_LAYERS.flatMap((layer) =>
  Array.from({ length: PETAL_COUNT }).map((_, idx) => ({
    angle: (360 / PETAL_COUNT) * idx + layer.offset,
    layer
  }))
);

const clamp01 = (value) => clamp(value, 0, 1);
const easeInOut = (t) => 0.5 - Math.cos(Math.PI * clamp01(t)) / 2;
const lerp = (a, b, t) => a + (b - a) * t;
const rgba = ([r, g, b], alpha) => `rgba(${r}, ${g}, ${b}, ${alpha})`;

export default function BreathVisualizer({ phase, progress, reducedMotion }) {
  const sequencePhase = PHASE_SEQUENCE.includes(phase) ? phase : 'inhale';
  const mappedProgress = clamp01(progress);
  const eased = easeInOut(mappedProgress);

  const fallback = rgbToArr(phaseColors[sequencePhase] || 'rgb(180,197,255)');
  const theme = phaseGradientTheme[sequencePhase] || {};
  const colorPrimary = theme.primary ?? fallback;
  const colorSecondary = theme.secondary ?? fallback;

  const growthCurve = Math.pow(mappedProgress, 0.7);

  const blossomScale = useMemo(() => {
    if (reducedMotion) return lerp(0.55, 0.85, growthCurve);
    switch (sequencePhase) {
      case 'inhale':
        return lerp(0.3, 0.95, growthCurve);
      case 'hold':
        return 0.98;
      case 'exhale':
        return lerp(0.95, 0.22, growthCurve);
      case 'rest':
      default:
        return 0.2;
    }
  }, [growthCurve, reducedMotion, sequencePhase]);

  const haloOpacity = useMemo(() => {
    if (sequencePhase === 'rest') return 0.12;
    return 0.24 + growthCurve * 0.42;
  }, [sequencePhase, growthCurve]);

  const bloomOpacity = useMemo(() => {
    if (sequencePhase === 'rest') return 0.34;
    return 0.32 + growthCurve * 0.5;
  }, [sequencePhase, growthCurve]);

  const haloScale = useMemo(() => {
    if (sequencePhase === 'rest') return 0.34;
    return 0.76 + growthCurve * 0.4;
  }, [sequencePhase, growthCurve]);

  const outerRotation = useMemo(() => {
    if (reducedMotion) return 0;
    switch (sequencePhase) {
      case 'inhale':
        return lerp(-20, 120, eased);
      case 'exhale':
        return lerp(120, -80, eased);
      case 'rest':
        return lerp(-80, -110, eased);
      case 'hold':
      default:
        return 120;
    }
  }, [sequencePhase, eased, reducedMotion]);

  const outerTransition = useMemo(() => (
    reducedMotion
      ? { duration: 0.2 }
      : { duration: 0.6, ease: 'easeInOut' }
  ), [reducedMotion]);

  const spinAnimation = useMemo(() => {
    if (reducedMotion) {
      return { rotate: 0, transition: { duration: 0.2 } };
    }
    if (sequencePhase === 'hold') {
      return { rotate: [0, 360], transition: { duration: 26, ease: 'linear', repeat: Infinity } };
    }
    return { rotate: 0, transition: { duration: 0.4, ease: 'easeOut' } };
  }, [sequencePhase, reducedMotion]);

  return (
    <div className="relative flex flex-col items-center gap-6">
      <div className="relative w-[min(62vw,320px)] aspect-square">
        <motion.div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 38%, ${rgba(colorPrimary, 0.38)}, rgba(8,12,20,0))`,
            filter: 'blur(52px)'
          }}
          animate={{ opacity: haloOpacity, scale: haloScale }}
          transition={{ duration: reducedMotion ? 0.2 : 0.55, ease: 'easeOut' }}
        />

        <motion.svg
          viewBox="0 0 200 200"
          className="absolute inset-0 h-auto w-auto"
          style={{ mixBlendMode: 'screen' }}
          animate={{ scale: blossomScale }}
          transition={{ duration: reducedMotion ? 0.2 : 0.55, ease: 'easeOut' }}
        >
          <defs>
            <linearGradient id="petalGradient-a" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={rgba(colorPrimary, 1)} />
              <stop offset="100%" stopColor={rgba(colorSecondary, 0.82)} />
            </linearGradient>
            <linearGradient id="petalGradient-b" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={rgba(colorSecondary, 0.9)} />
              <stop offset="100%" stopColor={rgba(colorPrimary, 0.74)} />
            </linearGradient>
            <radialGradient id="innerGlow" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor={rgba(colorPrimary, 0.82)} />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
          </defs>

          <motion.g
            style={{ transformOrigin: '100px 100px' }}
            animate={{ rotate: outerRotation, opacity: bloomOpacity }}
            transition={outerTransition}
          >
            <motion.g
              style={{ transformOrigin: '100px 100px' }}
              animate={{ rotate: spinAnimation.rotate }}
              transition={spinAnimation.transition}
            >
              {PETALS.map(({ angle, layer }, idx) => (
                <path
                  key={`${angle}-${idx}`}
                  d="M100 20 C113 44 115 72 100 98 C85 72 87 44 100 20 Z"
                  fill={`url(#petalGradient-${idx % 2 === 0 ? 'a' : 'b'})`}
                  transform={`translate(100,100) scale(${layer.scale}) translate(-100,-100) rotate(${angle},100,100)`}
                  opacity={layer.opacity}
                />
              ))}
              <circle cx="100" cy="100" r="30" fill="url(#innerGlow)" opacity={sequencePhase === 'rest' ? 0.28 : 0.46} />
            </motion.g>
          </motion.g>
        </motion.svg>
      </div>
    </div>
  );
}
