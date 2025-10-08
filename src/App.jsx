import { useState, useEffect, useRef, useReducer } from 'react';
import { Play, Pause, RotateCcw, Settings, X, ChevronRight, Plus } from 'lucide-react';

import { PROGRAMS, SAFETY_WARNING } from './constants/programs';
import { breathReducer, createInitialState } from './state/breathReducer';
import { getPhaseText, formatTime } from './utils/breathUtils';
import NumberField from './components/NumberField';
import BreathVisualizer from './components/BreathVisualizer';
import GeometricBackground from './components/GeometricBackground';

function Screen({ children, bgVariant, bgColor }) {
  return (
    <div className="relative min-h-screen bg-black text-white">
      <GeometricBackground variant={bgVariant} primary={bgColor} opacity={0.65} />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function App() {
  const [mode, setMode] = useState('select');
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [intensity, setIntensity] = useState(1);
  const [customPattern, setCustomPattern] = useState({ inhale: 4, hold: 7, exhale: 8, rest: 0 });
  const [customRounds, setCustomRounds] = useState(1);
  const [breathsPerRound, setBreathsPerRound] = useState(10);
  const [restBetweenRounds, setRestBetweenRounds] = useState(30);

  // NEW: global background choice
  const [bgVariant, setBgVariant] = useState('rose'); // 'rose' | 'lattice' | 'lines'
  const [bgColor, setBgColor] = useState('rgb(163, 230, 216)'); // teal

  const [state, dispatch] = useReducer(breathReducer, createInitialState());
  const rafRef = useRef(null);
  const sessionStartRef = useRef(0);
  const lastTickRef = useRef(0);
  const lastUiUpdateRef = useRef(0);
  const audioContextRef = useRef(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [, forceUi] = useState(0);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
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
      const frequencies = { inhale: 440, hold: 523.25, exhale: 349.23, rest: 392 };
      osc.frequency.value = frequencies[phase] || 440;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
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
  const getPhaseProgress = () => {
    if (!state.phaseStartTime || state.phase === 'prepare' || state.phase === 'complete') return 0;
    const pattern = getCurrentPattern();
    const duration = pattern[state.phase] || 0;
    if (duration <= 0) return 1;
    const elapsed = (performance.now() - state.phaseStartTime) / 1000;
    return Math.min(1, Math.max(0, elapsed / duration));
  };

  // ---------- SCREENS ----------
  if (mode === 'select') {
    return (
      <Screen bgVariant={bgVariant} bgColor={bgColor}>
        <div className="min-h-screen flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-5xl font-light tracking-tight">Breathe</h1>
              <p className="text-zinc-300/70 text-sm">Choose your practice</p>
            </div>

            <div className="space-y-3">
              {Object.entries(PROGRAMS).map(([key, program]) => (
                <button
                  key={key}
                  onClick={() => showPrepare(key)}
                  className="w-full bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800/60 rounded-lg p-6 text-left transition-all hover:border-zinc-700/60"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-light">{program.name}</h3>
                    <span className="text-sm text-zinc-400">{program.duration} min</span>
                  </div>
                  <p className="text-sm text-zinc-300/80">{program.description}</p>
                </button>
              ))}

              <button
                onClick={() => setMode('settings')}
                className="w-full bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800/60 rounded-lg p-6 text-left transition-all hover:border-zinc-700/60"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-light">Custom</h3>
                  <Settings className="w-5 h-5 text-zinc-400" />
                </div>
                <p className="text-sm text-zinc-300/80">Design your own practice</p>
              </button>
            </div>

            {/* Intensity */}
            <div className="bg-zinc-900/70 border border-zinc-800/60 rounded-lg p-6 space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm text-zinc-200">Intensity</label>
                <span className="text-sm font-medium">{intensity.toFixed(1)}x</span>
              </div>
              <div className="flex gap-2">
                {[0.5, 1.0, 1.5, 2.0].map(val => (
                  <button
                    key={val}
                    onClick={() => setIntensity(val)}
                    className={`flex-1 py-2 rounded text-sm transition-colors ${
                      intensity === val ? 'bg-white text-black' : 'bg-zinc-800/80 hover:bg-zinc-700/80'
                    }`}
                  >
                    {val}×
                  </button>
                ))}
              </div>
              <input
                type="range" min="0.5" max="2" step="0.1" value={intensity}
                onChange={(e) => setIntensity(parseFloat(e.target.value))}
                className="w-full h-2 bg-zinc-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              />
              <p className="text-xs text-zinc-400">Scales all timing proportionally</p>
            </div>

            {/* NEW: Background Picker */}
            <div className="bg-zinc-900/70 border border-zinc-800/60 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-200">Background</span>
                <span className="text-xs text-zinc-400 capitalize">{bgVariant}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {['rose','lattice','lines'].map(v => (
                  <button
                    key={v}
                    onClick={() => setBgVariant(v)}
                    className={`h-16 rounded-lg border transition ${
                      bgVariant === v ? 'border-white' : 'border-zinc-700/70 hover:border-zinc-600/70'
                    } bg-zinc-800/70`}
                  >
                    <span className="text-xs capitalize text-zinc-300">{v}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {[
                  'rgb(147, 197, 253)', // blue
                  'rgb(163, 230, 216)', // teal
                  'rgb(196, 181, 253)', // violet
                  'rgb(134, 239, 172)', // green
                  'rgb(244, 244, 245)'  // light
                ].map(c => (
                  <button
                    key={c}
                    onClick={() => setBgColor(c)}
                    className={`w-8 h-8 rounded-full border ${
                      bgColor === c ? 'border-white' : 'border-zinc-700'
                    }`}
                    style={{ background: c }}
                    aria-label={`Choose ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Screen>
    );
  }

  if (mode === 'prepare') {
    const program = selectedProgram === 'custom' ? null : PROGRAMS[selectedProgram];

    if (selectedProgram === 'custom') {
      const estimatedCycleTime = (customPattern.inhale + customPattern.hold + customPattern.exhale + customPattern.rest) * intensity;
      const estimatedTotal = breathsPerRound * estimatedCycleTime * customRounds + (customRounds - 1) * restBetweenRounds;

      return (
        <Screen bgVariant={bgVariant} bgColor={bgColor}>
          <div className="min-h-screen flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-2xl space-y-8">
              <button onClick={() => setMode('settings')} className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2">
                <ChevronRight className="w-4 h-4 rotate-180" />
                Back
              </button>

              <div className="space-y-6">
                <div>
                  <h1 className="text-4xl font-light mb-2">Custom Practice</h1>
                  <p className="text-zinc-300/80">{formatTime(estimatedTotal)} total · {breathsPerRound * customRounds} breaths</p>
                </div>

                <div className="bg-zinc-900/70 border border-zinc-800/60 rounded-lg p-6">
                  <h2 className="text-sm uppercase tracking-wider text-zinc-400 mb-4">Your Pattern</h2>
                  <div className="space-y-2 text-sm">
                    <Row label="Inhale" value={(customPattern.inhale * intensity).toFixed(1) + 's'} />
                    <Row label="Hold" value={(customPattern.hold * intensity).toFixed(1) + 's'} />
                    <Row label="Exhale" value={(customPattern.exhale * intensity).toFixed(1) + 's'} />
                    {customPattern.rest > 0 && <Row label="Rest" value={(customPattern.rest * intensity).toFixed(1) + 's'} />}
                  </div>
                </div>

                <div className="bg-amber-950/50 border border-amber-900/50 rounded-lg p-4">
                  <p className="text-amber-200 text-xs leading-relaxed">{SAFETY_WARNING}</p>
                </div>

                <button
                  onClick={startSession}
                  className="w-full bg-white text-black py-4 rounded-lg font-medium hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  Begin Practice
                </button>
              </div>
            </div>
          </div>
        </Screen>
      );
    }

    return (
      <Screen bgVariant={bgVariant} bgColor={bgColor}>
        <div className="min-h-screen flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-2xl space-y-8">
            <button onClick={() => setMode('select')} className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2">
              <ChevronRight className="w-4 h-4 rotate-180" />
              Back
            </button>

            <div className="space-y-6">
              <div>
                <h1 className="text-4xl font-light mb-2">{program.name}</h1>
                <p className="text-zinc-300/80">{program.duration} minute practice · {intensity}× intensity</p>
              </div>

              <div className="bg-zinc-900/70 border border-zinc-800/60 rounded-lg p-6">
                <h2 className="text-sm uppercase tracking-wider text-zinc-400 mb-4">Overview</h2>
                <p className="text-zinc-200 leading-relaxed mb-6">{program.instructions}</p>

                <div className="space-y-3">
                  {program.sequences.map((seq, idx) => (
                    <div key={idx} className="flex gap-4 items-start">
                      <span className="text-zinc-500 text-sm font-mono mt-1">{seq.minutes}m</span>
                      <div className="flex-1">
                        <p className="text-zinc-200 text-sm">{seq.description}</p>
                        <p className="text-zinc-500 text-xs mt-1 font-mono">
                          {(seq.pattern.inhale * intensity).toFixed(1)}s in / {(seq.pattern.hold * intensity).toFixed(1)}s hold / {(seq.pattern.exhale * intensity).toFixed(1)}s out
                          {seq.pattern.rest > 0 && ` / ${(seq.pattern.rest * intensity).toFixed(1)}s rest`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-amber-950/50 border border-amber-900/50 rounded-lg p-4">
                <p className="text-amber-200 text-xs leading-relaxed">{SAFETY_WARNING}</p>
              </div>

              <button
                onClick={startSession}
                className="w-full bg-white text-black py-4 rounded-lg font-medium hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Begin Practice
              </button>
            </div>
          </div>
        </div>
      </Screen>
    );
  }

  if (mode === 'settings') {
    const estimatedCycleTime = (customPattern.inhale + customPattern.hold + customPattern.exhale + customPattern.rest) * intensity;
    const estimatedTotal = breathsPerRound * estimatedCycleTime * customRounds + (customRounds - 1) * restBetweenRounds;

    return (
      <Screen bgVariant={bgVariant} bgColor={bgColor}>
        <div className="min-h-screen flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-md space-y-8">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-light">Custom Practice</h1>
              <button onClick={() => setMode('select')} className="p-2 hover:bg-zinc-900 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-zinc-900/70 border border-zinc-800/60 rounded-lg p-6 space-y-6">
              <div>
                <h2 className="text-sm uppercase tracking-wider text-zinc-400 mb-4">Pattern</h2>
                <div className="space-y-4">
                  <NumberField label="Inhale" value={customPattern.inhale} onChange={(v) => setCustomPattern({ ...customPattern, inhale: v })} min={1} max={20} step={0.5} />
                  <NumberField label="Hold" value={customPattern.hold} onChange={(v) => setCustomPattern({ ...customPattern, hold: v })} min={0} max={120} step={1} />
                  <NumberField label="Exhale" value={customPattern.exhale} onChange={(v) => setCustomPattern({ ...customPattern, exhale: v })} min={1} max={20} step={0.5} />
                  <NumberField label="Rest" value={customPattern.rest} onChange={(v) => setCustomPattern({ ...customPattern, rest: v })} min={0} max={20} step={0.5} />
                </div>
              </div>

              <div className="border-t border-zinc-800/60 pt-6">
                <h2 className="text-sm uppercase tracking-wider text-zinc-400 mb-4">Structure</h2>
                <div className="space-y-4">
                  <NumberField label="Rounds" value={customRounds} onChange={setCustomRounds} min={1} max={10} step={1} />
                  <NumberField label="Breaths per round" value={breathsPerRound} onChange={setBreathsPerRound} min={1} max={30} step={1} />
                  {customRounds > 1 && (
                    <NumberField label="Rest between rounds" value={restBetweenRounds} onChange={setRestBetweenRounds} min={0} max={300} step={10} />
                  )}
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/70 border border-zinc-800/60 rounded-lg p-4 text-sm space-y-2">
              <Row label="Total time" value={formatTime(estimatedTotal)} />
              <Row label="Cycle time" value={formatTime(estimatedCycleTime)} />
              <Row label="Total breaths" value={breathsPerRound * customRounds} />
            </div>

            <button
              onClick={() => showPrepare('custom')}
              className="w-full bg-white text-black py-4 rounded-lg font-medium hover:bg-zinc-200 transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      </Screen>
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

    return (
      <Screen bgVariant={bgVariant} bgColor={bgColor}>
        <div className="min-h-screen flex flex-col">
          <div className="w-full h-0.5 bg-zinc-900/60">
            <div className="h-full bg-white/90 transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
          </div>

          <div className="p-6 flex justify-between items-center border-b border-zinc-900/60">
            <div>
              <p className="text-sm text-zinc-300/80">
                {selectedProgram === 'custom' ? 'Custom' : PROGRAMS[selectedProgram]?.name}
              </p>
              <p className="text-xs text-zinc-400">{state.breathCount} breaths</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-mono tabular-nums">{formatTime(Math.max(0, sessionElapsed))}</p>
              <p className="text-xs text-zinc-400">of {formatTime(getTotalDuration())}</p>
            </div>
          </div>

          <div role="status" aria-live="polite" className="sr-only">
            {getPhaseText(state.phase)}: {phaseRemaining} seconds remaining
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-6">
            {state.phase === 'prepare' ? (
              <div className="text-center">
                <p className="text-7xl font-light mb-4">{Math.ceil(state.prepareTime / 1000)}</p>
                <p className="text-zinc-300/80 text-sm uppercase tracking-wider">Prepare to begin</p>
              </div>
            ) : (
              <>
                <div className="mb-12 w-[340px] h-[340px]">
                  <BreathVisualizer
                    phase={state.phase}
                    progress={(() => {
                      if (!state.phaseStartTime) return 0;
                      const duration = pattern[state.phase] || 0;
                      if (duration <= 0) return 1;
                      const elapsed = (performance.now() - state.phaseStartTime) / 1000;
                      return Math.min(1, Math.max(0, elapsed / duration));
                    })()}
                    reducedMotion={prefersReducedMotion}
                  />
                </div>

                <div className="text-center space-y-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                    {getPhaseText(state.phase)}
                  </p>
                  {state.phase !== 'complete' && state.phase !== 'ready' && (
                    <p className="text-7xl font-light tabular-nums">
                      {phaseRemaining}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="p-6 flex justify-center gap-4 border-t border-zinc-900/60">
            {state.phase !== 'prepare' && (
              <>
                <button
                  onClick={() => dispatch({ type: 'TOGGLE_PAUSE', now: performance.now() })}
                  className="flex items-center justify-center w-14 h-14 bg-zinc-900/70 rounded-full hover:bg-zinc-800/80 transition-colors border border-zinc-800/70"
                  aria-label={state.isActive ? 'Pause' : 'Resume'}
                >
                  {state.isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => { dispatch({ type: 'RESET' }); setMode('select'); }}
                  className="flex items-center justify-center w-14 h-14 bg-zinc-900/70 rounded-full hover:bg-zinc-800/80 transition-colors border border-zinc-800/70"
                  aria-label="Reset"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
      </Screen>
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