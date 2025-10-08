// src/App.jsx
import { useState, useEffect, useRef, useReducer } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, RotateCcw, Settings, X, ChevronRight } from 'lucide-react';

import { PROGRAMS, SAFETY_WARNING } from './constants/programs';
import { breathReducer, createInitialState } from './state/breathReducer';
import { getPhaseText, formatTime, phaseGradientTheme, phaseColors, rgbToArr } from './utils/breathUtils';
import NumberField from './components/NumberField';
import BreathVisualizer from './components/BreathVisualizer';
import AuroraBackground from './components/AuroraBackground';

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.12 + i * 0.06, duration: 0.45, ease: 'easeOut' }
  })
};

function App() {
  const [mode, setMode] = useState('select');
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [intensity, setIntensity] = useState(1);
  const [customPattern, setCustomPattern] = useState({ inhale: 4, hold: 7, exhale: 8, rest: 0 });
  const [customRounds, setCustomRounds] = useState(1);
  const [breathsPerRound, setBreathsPerRound] = useState(10);
  const [restBetweenRounds, setRestBetweenRounds] = useState(30);

  const [state, dispatch] = useReducer(breathReducer, createInitialState());
  const rafRef = useRef(null);
  const sessionStartRef = useRef(0);
  const lastTickRef = useRef(0);
  const lastUiUpdateRef = useRef(0);
  const audioContextRef = useRef(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [, forceUi] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const h = (e) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  const getCurrentPattern = () => {
    if (selectedProgram === 'custom') {
      return {
        inhale: customPattern.inhale * intensity,
        hold: (Number.isFinite(customPattern.hold) ? customPattern.hold : 0) * intensity,
        exhale: customPattern.exhale * intensity,
        rest: customPattern.rest * intensity
      };
    }
    if (!selectedProgram || !PROGRAMS[selectedProgram]) return { inhale: 4, hold: 4, exhale: 4, rest: 4 };
    const program = PROGRAMS[selectedProgram];
    const sessionTime = sessionStartRef.current
      ? (performance.now() - sessionStartRef.current - (state.totalPausedMs || 0)) / 1000
      : 0;
    let elapsed = 0;
    for (let seq of program.sequences) {
      if (sessionTime < elapsed + seq.minutes * 60) {
        return {
          inhale: seq.pattern.inhale * intensity,
          hold: seq.pattern.hold * intensity,
          exhale: seq.pattern.exhale * intensity,
          rest: seq.pattern.rest * intensity
        };
      }
      elapsed += seq.minutes * 60;
    }
    const lastSeq = program.sequences[program.sequences.length - 1];
    return {
      inhale: lastSeq.pattern.inhale * intensity,
      hold: lastSeq.pattern.hold * intensity,
      exhale: lastSeq.pattern.exhale * intensity,
      rest: lastSeq.pattern.rest * intensity
    };
  };

  const getTotalDuration = () => {
    if (selectedProgram === 'custom') {
      const cycleTime = (customPattern.inhale + customPattern.hold + customPattern.exhale + customPattern.rest) * intensity;
      return breathsPerRound * cycleTime * customRounds + (customRounds - 1) * restBetweenRounds;
    }
    if (!selectedProgram || !PROGRAMS[selectedProgram]) return 5 * 60;
    return PROGRAMS[selectedProgram].duration * 60;
  };

  const playPhaseSound = (phase) => {
    if (!audioContextRef.current) return;
    try {
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const f = { inhale: 440, hold: 523.25, exhale: 349.23, rest: 392 };
      osc.frequency.value = f[phase] || 440;
      osc.type = phase === 'inhale' ? 'sine' : 'triangle';
      osc.connect(gain); gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.1, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.15);
    } catch {}
  };

  useEffect(() => {
    if (mode !== 'session') return;

    const tick = (now) => {
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;

      if (now - lastUiUpdateRef.current >= 100 && (state.isActive || state.phase === 'prepare')) {
        lastUiUpdateRef.current = now;
        forceUi((n) => (n + 1) % 1000000);
      }

      if (state.phase === 'prepare') {
        const newPrepareTime = state.prepareTime - delta;
        if (newPrepareTime <= 0) {
          sessionStartRef.current = now;
          dispatch({ type: 'BEGIN_BREATHING', now });
          playPhaseSound('inhale');
        } else {
          dispatch({ type: 'UPDATE_PREPARE', prepareTime: newPrepareTime });
        }
      } else if (state.isActive && state.phase !== 'complete') {
        const pattern = getCurrentPattern();
        const phaseElapsed = (now - state.phaseStartTime) / 1000;
        const phaseDuration = pattern[state.phase] || 0;

        if (phaseDuration === 0 || phaseElapsed >= phaseDuration) {
          dispatch({ type: 'NEXT_PHASE', now });
          playPhaseSound(state.phase);
        }

        const sessionElapsed = (now - sessionStartRef.current - (state.totalPausedMs || 0)) / 1000;
        if (sessionElapsed >= getTotalDuration()) {
          dispatch({ type: 'COMPLETE' });
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    lastTickRef.current = performance.now();
    lastUiUpdateRef.current = lastTickRef.current;
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, state.phase, state.isActive, state.phaseStartTime, state.prepareTime, state.totalPausedMs, selectedProgram, intensity, customPattern, breathsPerRound, customRounds, restBetweenRounds]);

  const showPrepare = (program) => { setSelectedProgram(program); setMode('prepare'); };
  const startSession = () => {
    if (!audioContextRef.current) {
      try { audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
    }
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') audioContextRef.current.resume();
    dispatch({ type: 'START' });
    setMode('session');
  };

  // ---------- SCREENS ----------
  if (mode === 'select') {
    return (
      <div className="relative min-h-screen overflow-hidden text-white">
        <AuroraBackground reducedMotion={prefersReducedMotion} />
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
          <motion.div
            className="w-full max-w-md space-y-8"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <motion.div
              className="text-center space-y-2"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut', delay: 0.1 }}
            >
              <h1 className="text-5xl font-light tracking-tight">Breathe</h1>
              <p className="text-zinc-300/70 text-sm">Choose your practice</p>
            </motion.div>

            <motion.div className="space-y-3" initial="hidden" animate="visible">
              {Object.entries(PROGRAMS).map(([key, program], index) => (
                <motion.button
                  key={key}
                  type="button"
                  custom={index}
                  variants={cardVariants}
                  whileHover={{ scale: prefersReducedMotion ? 1 : 1.02, borderColor: 'rgba(255,255,255,0.22)', boxShadow: '0 18px 46px rgba(59,130,246,0.18)' }}
                  whileTap={{ scale: prefersReducedMotion ? 1 : 0.97 }}
                  onClick={() => showPrepare(key)}
                  className="w-full rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-6 text-left transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-light">{program.name}</h3>
                    <span className="text-sm text-zinc-300/70">{program.duration} min</span>
                  </div>
                  <p className="text-sm text-zinc-300/80">{program.description}</p>
                </motion.button>
              ))}

              <motion.button
                type="button"
                custom={Object.keys(PROGRAMS).length}
                variants={cardVariants}
                whileHover={{ scale: prefersReducedMotion ? 1 : 1.02, borderColor: 'rgba(255,255,255,0.22)', boxShadow: '0 18px 46px rgba(59,130,246,0.18)' }}
                whileTap={{ scale: prefersReducedMotion ? 1 : 0.97 }}
                onClick={() => setMode('settings')}
                className="w-full rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-6 text-left transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-light">Custom</h3>
                  <Settings className="w-5 h-5 text-zinc-300/70" />
                </div>
                <p className="text-sm text-zinc-300/80">Design your own practice</p>
              </motion.button>
            </motion.div>

            <motion.div
              className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-6 space-y-4"
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
            >
              <div className="flex justify-between items-center">
                <label className="text-sm text-zinc-200">Intensity</label>
                <span className="text-sm font-medium">{intensity.toFixed(1)}x</span>
              </div>
              <div className="flex gap-2">
                {[0.5, 1.0, 1.5, 2.0].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setIntensity(val)}
                    className={`flex-1 py-2 rounded-lg text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                      intensity === val ? 'bg-white text-black shadow-[0_0_24px_rgba(255,255,255,0.24)]' : 'bg-zinc-800/70 hover:bg-zinc-700/80'
                    }`}
                  >
                    {val}×
                  </button>
                ))}
              </div>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={intensity}
                onChange={(e) => setIntensity(parseFloat(e.target.value))}
                className="w-full h-2 bg-zinc-800 rounded-full appearance-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              />
              <p className="text-xs text-zinc-400">Scales all timing proportionally</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (mode === 'prepare') {
    const program = selectedProgram === 'custom' ? null : PROGRAMS[selectedProgram];

    if (selectedProgram === 'custom') {
      const estimatedCycleTime = (customPattern.inhale + customPattern.hold + customPattern.exhale + customPattern.rest) * intensity;
      const estimatedTotal = breathsPerRound * estimatedCycleTime * customRounds + (customRounds - 1) * restBetweenRounds;

      return (
        <div className="relative min-h-screen overflow-hidden text-white">
          <AuroraBackground reducedMotion={prefersReducedMotion} />
          <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
            <motion.div
              className="w-full max-w-2xl space-y-8"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
            >
              <motion.button
                type="button"
                onClick={() => setMode('settings')}
                className="text-zinc-300/80 hover:text-white transition-colors flex items-center gap-2"
                whileHover={prefersReducedMotion ? undefined : { x: -6 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                Back
              </motion.button>

              <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1, duration: 0.4 }}>
                <div className="space-y-2">
                  <h1 className="text-4xl font-light">Custom Practice</h1>
                  <p className="text-zinc-300/80">{formatTime(estimatedTotal)} total · {breathsPerRound * customRounds} breaths</p>
                </div>

                <motion.div
                  className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-6"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.14, duration: 0.45, ease: 'easeOut' }}
                >
                  <h2 className="text-sm uppercase tracking-wider text-zinc-400 mb-4">Your Pattern</h2>
                  <div className="space-y-2 text-sm">
                    <Row label="Inhale" value={(customPattern.inhale * intensity).toFixed(1) + 's'} />
                    <Row label="Hold" value={(customPattern.hold * intensity).toFixed(1) + 's'} />
                    <Row label="Exhale" value={(customPattern.exhale * intensity).toFixed(1) + 's'} />
                    {customPattern.rest > 0 && <Row label="Rest" value={(customPattern.rest * intensity).toFixed(1) + 's'} />}
                  </div>
                </motion.div>

                <motion.div
                  className="bg-amber-950/50 border border-amber-900/50 rounded-2xl p-4"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18, duration: 0.45, ease: 'easeOut' }}
                >
                  <p className="text-amber-200 text-xs leading-relaxed">{SAFETY_WARNING}</p>
                </motion.div>

                <motion.button
                  type="button"
                  onClick={startSession}
                  whileHover={prefersReducedMotion ? undefined : { scale: 1.02, boxShadow: '0 20px 40px rgba(255,255,255,0.18)' }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
                  className="w-full bg-white text-black py-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  Begin Practice
                </motion.button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      );
    }

    return (
      <div className="relative min-h-screen overflow-hidden text-white">
        <AuroraBackground reducedMotion={prefersReducedMotion} />
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
          <motion.div
            className="w-full max-w-2xl space-y-8"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            <motion.button
              type="button"
              onClick={() => setMode('select')}
              className="text-zinc-300/80 hover:text-white transition-colors flex items-center gap-2"
              whileHover={prefersReducedMotion ? undefined : { x: -6 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              Back
            </motion.button>

            <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1, duration: 0.4 }}>
              <div className="space-y-2">
                <h1 className="text-4xl font-light">{program.name}</h1>
                <p className="text-zinc-300/80">{program.duration} minute practice · {intensity}× intensity</p>
              </div>

              <motion.div
                className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-6"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14, duration: 0.45, ease: 'easeOut' }}
              >
                <h2 className="text-sm uppercase tracking-wider text-zinc-400 mb-4">Overview</h2>
                <p className="text-zinc-200 leading-relaxed mb-6">{program.instructions}</p>

                <div className="space-y-3">
                  {program.sequences.map((seq, idx) => (
                    <motion.div
                      key={idx}
                      className="flex gap-4 items-start"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.18 + idx * 0.05, duration: 0.4, ease: 'easeOut' }}
                    >
                      <span className="text-zinc-500 text-sm font-mono mt-1">{seq.minutes}m</span>
                      <div className="flex-1">
                        <p className="text-zinc-200 text-sm">{seq.description}</p>
                        <p className="text-zinc-500 text-xs mt-1 font-mono">
                          {(seq.pattern.inhale * intensity).toFixed(1)}s in / {(seq.pattern.hold * intensity).toFixed(1)}s hold / {(seq.pattern.exhale * intensity).toFixed(1)}s out
                          {seq.pattern.rest > 0 && ` / ${(seq.pattern.rest * intensity).toFixed(1)}s rest`}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                className="bg-amber-950/50 border border-amber-900/50 rounded-2xl p-4"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24, duration: 0.45, ease: 'easeOut' }}
              >
                <p className="text-amber-200 text-xs leading-relaxed">{SAFETY_WARNING}</p>
              </motion.div>

              <motion.button
                type="button"
                onClick={startSession}
                whileHover={prefersReducedMotion ? undefined : { scale: 1.02, boxShadow: '0 20px 40px rgba(255,255,255,0.18)' }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
                className="w-full bg-white text-black py-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Begin Practice
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (mode === 'settings') {
    const estimatedCycleTime = (customPattern.inhale + customPattern.hold + customPattern.exhale + customPattern.rest) * intensity;
    const estimatedTotal = breathsPerRound * estimatedCycleTime * customRounds + (customRounds - 1) * restBetweenRounds;

    return (
      <div className="relative min-h-screen overflow-hidden text-white">
        <AuroraBackground reducedMotion={prefersReducedMotion} />
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
          <motion.div
            className="w-full max-w-md space-y-8"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-light">Custom Practice</h1>
              <motion.button
                type="button"
                onClick={() => setMode('select')}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                whileHover={prefersReducedMotion ? undefined : { rotate: -10 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.92 }}
              >
                <X className="w-6 h-6" />
              </motion.button>
            </div>

            <motion.div
              className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-6 space-y-6"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.45, ease: 'easeOut' }}
            >
              <div>
                <h2 className="text-sm uppercase tracking-wider text-zinc-400 mb-4">Pattern</h2>
                <div className="space-y-4">
                  <NumberField label="Inhale" value={customPattern.inhale} onChange={(v) => setCustomPattern({ ...customPattern, inhale: v })} min={1} max={20} step={0.5} />
                  <NumberField label="Hold" value={customPattern.hold} onChange={(v) => setCustomPattern({ ...customPattern, hold: v })} min={0} max={120} step={1} />
                  <NumberField label="Exhale" value={customPattern.exhale} onChange={(v) => setCustomPattern({ ...customPattern, exhale: v })} min={1} max={20} step={0.5} />
                  <NumberField label="Rest" value={customPattern.rest} onChange={(v) => setCustomPattern({ ...customPattern, rest: v })} min={0} max={20} step={0.5} />
                </div>
              </div>

              <div className="border-t border-white/10 pt-6">
                <h2 className="text-sm uppercase tracking-wider text-zinc-400 mb-4">Structure</h2>
                <div className="space-y-4">
                  <NumberField label="Rounds" value={customRounds} onChange={setCustomRounds} min={1} max={10} step={1} />
                  <NumberField label="Breaths per round" value={breathsPerRound} onChange={setBreathsPerRound} min={1} max={30} step={1} />
                  {customRounds > 1 && (
                    <NumberField label="Rest between rounds" value={restBetweenRounds} onChange={setRestBetweenRounds} min={0} max={300} step={10} />
                  )}
                </div>
              </div>
            </motion.div>

            <motion.div
              className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-4 text-sm space-y-2"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14, duration: 0.45, ease: 'easeOut' }}
            >
              <Row label="Total time" value={formatTime(estimatedTotal)} />
              <Row label="Cycle time" value={formatTime(estimatedCycleTime)} />
              <Row label="Total breaths" value={breathsPerRound * customRounds} />
            </motion.div>

            <motion.button
              type="button"
              onClick={() => showPrepare('custom')}
              whileHover={prefersReducedMotion ? undefined : { scale: 1.02, boxShadow: '0 20px 40px rgba(255,255,255,0.16)' }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
              className="w-full bg-white text-black py-4 rounded-xl font-medium transition-colors"
            >
              Continue
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (mode === 'session') {
    const sessionElapsed = sessionStartRef.current
      ? (performance.now() - sessionStartRef.current - (state.totalPausedMs || 0)) / 1000
      : 0;
    const progress = (sessionElapsed / getTotalDuration()) * 100;
    const pattern = getCurrentPattern();
    const phaseElapsed = state.phaseStartTime ? (performance.now() - state.phaseStartTime) / 1000 : 0;
    const phaseDuration = pattern[state.phase] || 0;
    const phaseRemaining = Math.max(0, Math.ceil(phaseDuration - phaseElapsed));

    const phaseProgress = (() => {
      if (!state.phaseStartTime) return 0;
      const duration = pattern[state.phase] || 0;
      if (duration <= 0) return 1;
      const elapsed = (performance.now() - state.phaseStartTime) / 1000;
      return Math.min(1, Math.max(0, elapsed / duration));
    })();

    const paletteTheme = phaseGradientTheme[state.phase];
    const palette = paletteTheme
      ? paletteTheme
      : (() => {
          const fallback = rgbToArr(phaseColors[state.phase] || 'rgb(180,197,255)');
          return { primary: fallback, secondary: fallback };
        })();

    const progressGradient = `linear-gradient(135deg, rgba(${palette.primary[0]},${palette.primary[1]},${palette.primary[2]},0.88), rgba(${palette.secondary[0]},${palette.secondary[1]},${palette.secondary[2]},0.78))`;

    return (
      <div className="relative min-h-screen overflow-hidden text-white">
        <AuroraBackground reducedMotion={prefersReducedMotion} />
        <div className="relative z-10 min-h-screen flex flex-col bg-gradient-to-b from-black/20 via-black/10 to-transparent">
          <div className="w-full h-0.5 bg-white/10">
            <motion.div
              className="h-full bg-white/90"
              animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.45, ease: 'easeOut' }}
            />
          </div>

          <motion.div
            className="p-6 flex justify-between items-center border-b border-white/10 backdrop-blur-sm bg-white/5"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <div>
              <p className="text-sm text-zinc-200/90">
                {selectedProgram === 'custom' ? 'Custom' : PROGRAMS[selectedProgram]?.name}
              </p>
              <p className="text-xs text-zinc-400">{state.breathCount} breaths</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-mono tabular-nums">{formatTime(Math.max(0, sessionElapsed))}</p>
              <p className="text-xs text-zinc-400">of {formatTime(getTotalDuration())}</p>
            </div>
          </motion.div>

          <div role="status" aria-live="polite" className="sr-only">
            {getPhaseText(state.phase)}: {phaseRemaining} seconds remaining
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-6">
            {state.phase === 'prepare' ? (
              <motion.div
                className="text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                <p className="text-7xl font-light mb-4">{Math.ceil(state.prepareTime / 1000)}</p>
                <p className="text-zinc-300/80 text-sm uppercase tracking-wider">Prepare to begin</p>
              </motion.div>
            ) : (
              <>
                <motion.div
                  className="mb-10 w-full max-w-sm"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                >
                  <BreathVisualizer
                    phase={state.phase}
                    progress={phaseProgress}
                    reducedMotion={prefersReducedMotion}
                  />
                </motion.div>

                <motion.div
                  className="text-center space-y-4"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-300/80">
                    {getPhaseText(state.phase)}
                  </p>
                  <div className="mx-auto h-[2px] w-32 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full"
                      style={{ background: progressGradient }}
                      animate={{ width: `${Math.round(phaseProgress * 100)}%` }}
                      transition={{ duration: prefersReducedMotion ? 0.2 : 0.35, ease: 'easeOut' }}
                    />
                  </div>
                  {state.phase !== 'complete' && state.phase !== 'ready' && (
                    <p className="text-7xl font-light tabular-nums">
                      {phaseRemaining}
                    </p>
                  )}
                </motion.div>
              </>
            )}
          </div>

          <motion.div
            className="p-6 flex justify-center gap-4 border-t border-white/10 backdrop-blur-sm bg-white/5"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            {state.phase !== 'prepare' && (
              <>
                <motion.button
                  onClick={() => dispatch({ type: 'TOGGLE_PAUSE', now: performance.now() })}
                  className="flex items-center justify-center w-14 h-14 bg-black/40 rounded-full border border-white/15 text-white"
                  aria-label={state.isActive ? 'Pause' : 'Resume'}
                  whileHover={prefersReducedMotion ? undefined : { scale: 1.05, boxShadow: '0 0 30px rgba(255,255,255,0.18)' }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.9 }}
                >
                  {state.isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </motion.button>
                <motion.button
                  onClick={() => { dispatch({ type: 'RESET' }); setMode('select'); }}
                  className="flex items-center justify-center w-14 h-14 bg-black/40 rounded-full border border-white/15 text-white"
                  aria-label="Reset"
                  whileHover={prefersReducedMotion ? undefined : { scale: 1.05, boxShadow: '0 0 30px rgba(255,255,255,0.18)' }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.9 }}
                >
                  <RotateCcw className="w-5 h-5" />
                </motion.button>
              </>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  return null;
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-zinc-400">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

export default App;
