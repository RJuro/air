import { useState, useEffect, useRef, useReducer } from 'react';
import { Play, Pause, RotateCcw, Settings, X, ChevronRight, Plus, Minus } from 'lucide-react';

const PROGRAMS = {
  foundation: {
    name: "Foundation",
    description: "Build your breathing foundation with balanced rhythms",
    duration: 5,
    instructions: "Equal box breathing establishes your baseline. Find a comfortable seat. Breathe through your nose. Keep shoulders relaxed. Focus on smooth, controlled transitions between phases.",
    sequences: [
      { kind: 'static', minutes: 5, pattern: { inhale: 4, hold: 4, exhale: 4, rest: 4 }, description: "Box breathing foundation" }
    ]
  },
  endurance: {
    name: "Endurance",
    description: "Progressive retention training to build capacity",
    duration: 12,
    instructions: "Build retention capacity gradually. Start with box breathing, then progress to longer holds. Stay completely relaxed during retention—tension defeats the purpose. If you feel strain, return to normal breathing.",
    sequences: [
      { kind: 'static', minutes: 3, pattern: { inhale: 4, hold: 4, exhale: 4, rest: 4 }, description: "Box breathing warm-up" },
      { kind: 'static', minutes: 5, pattern: { inhale: 6, hold: 24, exhale: 6, rest: 0 }, description: "Extended retention phase" },
      { kind: 'static', minutes: 4, pattern: { inhale: 8, hold: 32, exhale: 8, rest: 0 }, description: "Deeper retention phase" }
    ]
  },
  mastery: {
    name: "Mastery",
    description: "Advanced breath control with extended retention cycles",
    duration: 15,
    instructions: "Advanced practice building toward 60-second holds. Maintain complete relaxation. Your heart rate may slow—this is normal. Never force the breath. If discomfort arises, skip a cycle and breathe normally. Progress comes from consistency, not strain.",
    sequences: [
      { kind: 'static', minutes: 2, pattern: { inhale: 4, hold: 4, exhale: 4, rest: 4 }, description: "Box breathing preparation" },
      { kind: 'static', minutes: 5, pattern: { inhale: 6, hold: 24, exhale: 6, rest: 0 }, description: "Building capacity" },
      { kind: 'static', minutes: 5, pattern: { inhale: 8, hold: 40, exhale: 8, rest: 0 }, description: "Extended hold practice" },
      { kind: 'static', minutes: 3, pattern: { inhale: 8, hold: 52, exhale: 8, rest: 0 }, description: "Maximum retention phase" }
    ]
  },
  coherent: {
    name: "Coherent",
    description: "Heart rate variability optimization at 5.5 breaths per minute",
    duration: 10,
    instructions: "Coherent breathing synchronizes your heart rate variability. Breathe slowly and evenly—no holds, just smooth transitions. This is particularly effective for stress reduction and nervous system balance.",
    sequences: [
      { kind: 'static', minutes: 10, pattern: { inhale: 5.5, hold: 0, exhale: 5.5, rest: 0 }, description: "Coherent breathing rhythm" }
    ]
  },
  calming: {
    name: "Calming",
    description: "Cyclic sighing with extended exhales for relaxation",
    duration: 8,
    instructions: "Extended exhales activate your parasympathetic nervous system. Take a full breath, add a small top-up, then release slowly. This pattern has been shown to reduce anxiety and improve mood.",
    sequences: [
      { kind: 'static', minutes: 8, pattern: { inhale: 4, hold: 2, exhale: 8, rest: 0 }, description: "Extended exhale breathing" }
    ]
  }
};

const SAFETY_WARNING = "⚠️ Safety: Never practice breath retention near water, while driving, or if you have cardiovascular conditions. Stop immediately if you feel dizzy or uncomfortable. Consult a healthcare professional before starting any breath work practice.";

function breathReducer(state, action) {
  switch (action.type) {
    case 'START':
      return {
        ...state,
        phase: 'prepare',
        prepareTime: 5000,
        isActive: false,
        totalPausedMs: 0,
        pauseStartedAt: null
      };
    case 'BEGIN_BREATHING':
      return { ...state, phase: 'inhale', isActive: true, phaseStartTime: action.now };
    case 'TOGGLE_PAUSE': {
      if (state.isActive) {
        return { ...state, isActive: false, pauseStartedAt: action.now };
      } else {
        const pausedMs = state.pauseStartedAt ? action.now - state.pauseStartedAt : 0;
        return {
          ...state,
          isActive: true,
          totalPausedMs: (state.totalPausedMs || 0) + pausedMs,
          pauseStartedAt: null,
          // re-anchor phase start so elapsed freezes while paused
          phaseStartTime: state.phaseStartTime + pausedMs
        };
      }
    }
    case 'NEXT_PHASE': {
      const phases = state.pattern.rest > 0
        ? ['inhale', 'hold', 'exhale', 'rest']
        : ['inhale', 'hold', 'exhale'];
      const currentIndex = phases.indexOf(state.phase);
      const nextPhase = phases[(currentIndex + 1) % phases.length];
      return {
        ...state,
        phase: nextPhase,
        phaseStartTime: action.now,
        breathCount: nextPhase === 'inhale' ? state.breathCount + 1 : state.breathCount
      };
    }
    case 'COMPLETE':
      return { ...state, phase: 'complete', isActive: false };
    case 'RESET':
      return {
        phase: 'ready',
        isActive: false,
        sessionStartTime: 0,
        phaseStartTime: 0,
        breathCount: 0,
        prepareTime: 5000,
        pattern: state.pattern,
        totalPausedMs: 0,
        pauseStartedAt: null
      };
    case 'UPDATE_PREPARE':
      return { ...state, prepareTime: action.prepareTime };
    default:
      return state;
  }
}

function NumberField({ label, value, onChange, min = 0, max = 120, step = 1 }) {
  return (
    <div className="flex justify-between items-center">
      <label className="text-sm text-zinc-300">{label}</label>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, Number((value - step).toFixed(2))))}
          className="w-8 h-8 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700 transition-colors"
          aria-label={`Decrease ${label}`}
          type="button"
        >
          <Plus className="w-4 h-4 rotate-180" />
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const num = parseFloat(e.target.value);
            if (!isNaN(num)) onChange(Math.max(min, Math.min(max, num)));
          }}
          className="w-16 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-center font-mono text-white"
          min={min}
          max={max}
          step={step}
        />
        <button
          onClick={() => onChange(Math.min(max, Number((value + step).toFixed(2))))}
          className="w-8 h-8 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700 transition-colors"
          aria-label={`Increase ${label}`}
          type="button"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
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

  const [state, dispatch] = useReducer(breathReducer, {
    phase: 'ready',
    isActive: false,
    sessionStartTime: 0,
    phaseStartTime: 0,
    breathCount: 0,
    prepareTime: 5000,
    pattern: { inhale: 4, hold: 4, exhale: 4, rest: 4 },
    totalPausedMs: 0,
    pauseStartedAt: null
  });

  const rafRef = useRef(null);
  const sessionStartRef = useRef(0);
  const lastTickRef = useRef(0);
  const lastUiUpdateRef = useRef(0);
  const audioContextRef = useRef(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [, forceUi] = useState(0); // light rerender driver

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
        hold: customPattern.hhold * 0 || customPattern.hold * intensity, // guard against undefined
        exhale: customPattern.exhale * intensity,
        rest: customPattern.rest * intensity
      };
    }
    if (!selectedProgram || !PROGRAMS[selectedProgram]) {
      return { inhale: 4, hold: 4, exhale: 4, rest: 4 };
    }
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
    } catch (e) {}
  };

  useEffect(() => {
    if (mode !== 'session') return;
    const tick = (now) => {
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;

      // UI throttle: update ~10fps for smooth countdown/arc, avoid 60fps churn
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

  const showPrepare = (program) => {
    setSelectedProgram(program);
    setMode('prepare');
  };

  const startSession = () => {
    if (!audioContextRef.current) {
      try { audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
    }
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
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

  const getBreathScale = () => {
    const progress = getPhaseProgress();
    if (state.phase === 'inhale') return 0.3 + progress * 0.7;
    if (state.phase === 'exhale') return 1 - progress * 0.7;
    if (state.phase === 'rest') return 0.3;
    return 1;
  };

  const getPhaseColor = () => {
    const colors = {
      inhale: 'rgb(147, 197, 253)',
      hold: 'rgb(196, 181, 253)',
      exhale: 'rgb(134, 239, 172)',
      rest: 'rgb(161, 161, 170)'
    };
    return colors[state.phase] || 'rgb(161, 161, 170)';
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseText = () => {
    const texts = {
      prepare: 'Prepare',
      inhale: 'Breathe In',
      hold: 'Hold',
      exhale: 'Breathe Out',
      rest: 'Rest',
      complete: 'Complete'
    };
    return texts[state.phase] || '';
  };

  const renderBreathRing = () => {
    const scale = getBreathScale();
    const progress = getPhaseProgress(); // 0 → 1
    const radius = 120;
    const strokeWidth = prefersReducedMotion ? 2 : 8 + scale * 12;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - progress); // progress arc

    return (
      <svg width="300" height="300" viewBox="0 0 300 300"
           className="transform transition-transform duration-300"
           style={{ transform: `scale(${prefersReducedMotion ? 1 : scale})` }}>
        <circle
          cx="150" cy="150" r={radius}
          fill="none" stroke="rgba(255, 255, 255, 0.1)" strokeWidth={strokeWidth}
        />
        <circle
          cx="150" cy="150" r={radius}
          fill="none" stroke={getPhaseColor()} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          strokeLinecap="round" transform="rotate(-90 150 150)"
          style={{ transition: prefersReducedMotion ? 'none' : 'stroke-dashoffset 0.1s linear' }}
        />
        <circle cx="150" cy="150" r={20} fill={getPhaseColor()} opacity="0.5" />
      </svg>
    );
  };

  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-5xl font-light tracking-tight">Breathe</h1>
            <p className="text-zinc-500 text-sm">Choose your practice</p>
          </div>

          <div className="space-y-3">
            {Object.entries(PROGRAMS).map(([key, program]) => (
              <button
                key={key}
                onClick={() => showPrepare(key)}
                className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg p-6 text-left transition-all hover:border-zinc-700"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-light">{program.name}</h3>
                  <span className="text-sm text-zinc-500">{program.duration} min</span>
                </div>
                <p className="text-sm text-zinc-400">{program.description}</p>
              </button>
            ))}

            <button
              onClick={() => setMode('settings')}
              className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg p-6 text-left transition-all hover:border-zinc-700"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-light">Custom</h3>
                <Settings className="w-5 h-5 text-zinc-500" />
              </div>
              <p className="text-sm text-zinc-400">Design your own practice</p>
            </button>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-sm text-zinc-300">Intensity</label>
              <span className="text-sm font-medium">{intensity.toFixed(1)}x</span>
            </div>
            <div className="flex gap-2">
              {[0.5, 1.0, 1.5, 2.0].map(val => (
                <button
                  key={val}
                  onClick={() => setIntensity(val)}
                  className={`flex-1 py-2 rounded text-sm transition-colors ${
                    intensity === val ? 'bg-white text-black' : 'bg-zinc-800 hover:bg-zinc-700'
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
              className="w-full h-2 bg-zinc-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
            />
            <p className="text-xs text-zinc-500">Scales all timing proportionally</p>
          </div>
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
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white">
          <div className="w-full max-w-2xl space-y-8">
            <button
              onClick={() => setMode('settings')}
              className="text-zinc-500 hover:text-white transition-colors flex items-center gap-2"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              Back
            </button>

            <div className="space-y-6">
              <div>
                <h1 className="text-4xl font-light mb-2">Custom Practice</h1>
                <p className="text-zinc-400">{formatTime(estimatedTotal)} total · {breathsPerRound * customRounds} breaths</p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                <h2 className="text-sm uppercase tracking-wider text-zinc-500 mb-4">Your Pattern</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Inhale</span>
                    <span className="font-mono">{(customPattern.inhale * intensity).toFixed(1)}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Hold</span>
                    <span className="font-mono">{(customPattern.hold * intensity).toFixed(1)}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Exhale</span>
                    <span className="font-mono">{(customPattern.exhale * intensity).toFixed(1)}s</span>
                  </div>
                  {customPattern.rest > 0 && (
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Rest</span>
                      <span className="font-mono">{(customPattern.rest * intensity).toFixed(1)}s</span>
                    </div>
                  )}
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
      );
    }

    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white">
        <div className="w-full max-w-2xl space-y-8">
          <button
            onClick={() => setMode('select')}
            className="text-zinc-500 hover:text-white transition-colors flex items-center gap-2"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back
          </button>

          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-light mb-2">{program.name}</h1>
              <p className="text-zinc-400">{program.duration} minute practice · {intensity}× intensity</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <h2 className="text-sm uppercase tracking-wider text-zinc-500 mb-4">Overview</h2>
              <p className="text-zinc-300 leading-relaxed mb-6">{program.instructions}</p>

              <div className="space-y-3">
                {program.sequences.map((seq, idx) => (
                  <div key={idx} className="flex gap-4 items-start">
                    <span className="text-zinc-600 text-sm font-mono mt-1">{seq.minutes}m</span>
                    <div className="flex-1">
                      <p className="text-zinc-300 text-sm">{seq.description}</p>
                      <p className="text-zinc-600 text-xs mt-1 font-mono">
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
    );
  }

  if (mode === 'settings') {
    const estimatedCycleTime = (customPattern.inhale + customPattern.hold + customPattern.exhale + customPattern.rest) * intensity;
    const estimatedTotal = breathsPerRound * estimatedCycleTime * customRounds + (customRounds - 1) * restBetweenRounds;

    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white">
        <div className="w-full max-w-md space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-light">Custom Practice</h1>
            <button onClick={() => setMode('select')} className="p-2 hover:bg-zinc-900 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-6">
            <div>
              <h2 className="text-sm uppercase tracking-wider text-zinc-500 mb-4">Pattern</h2>
              <div className="space-y-4">
                <NumberField label="Inhale" value={customPattern.inhale} onChange={(v) => setCustomPattern({ ...customPattern, inhale: v })} min={1} max={20} step={0.5} />
                <NumberField label="Hold" value={customPattern.hold} onChange={(v) => setCustomPattern({ ...customPattern, hold: v })} min={0} max={120} step={1} />
                <NumberField label="Exhale" value={customPattern.exhale} onChange={(v) => setCustomPattern({ ...customPattern, exhale: v })} min={1} max={20} step={0.5} />
                <NumberField label="Rest" value={customPattern.rest} onChange={(v) => setCustomPattern({ ...customPattern, rest: v })} min={0} max={20} step={0.5} />
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-6">
              <h2 className="text-sm uppercase tracking-wider text-zinc-500 mb-4">Structure</h2>
              <div className="space-y-4">
                <NumberField label="Rounds" value={customRounds} onChange={setCustomRounds} min={1} max={10} step={1} />
                <NumberField label="Breaths per round" value={breathsPerRound} onChange={setBreathsPerRound} min={1} max={30} step={1} />
                {customRounds > 1 && (
                  <NumberField label="Rest between rounds" value={restBetweenRounds} onChange={setRestBetweenRounds} min={0} max={300} step={10} />
                )}
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-zinc-400">Total time</span>
              <span className="font-mono">{formatTime(estimatedTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Cycle time</span>
              <span className="font-mono">{formatTime(estimatedCycleTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Total breaths</span>
              <span className="font-mono">{breathsPerRound * customRounds}</span>
            </div>
          </div>

          <button
            onClick={() => showPrepare('custom')}
            className="w-full bg-white text-black py-4 rounded-lg font-medium hover:bg-zinc-200 transition-colors"
          >
            Continue
          </button>
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

    return (
      <div className="min-h-screen bg-black flex flex-col text-white">
        <div className="w-full h-0.5 bg-zinc-900">
          <div
            className="h-full bg-white transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>

        <div className="p-6 flex justify-between items-center border-b border-zinc-900">
          <div>
            <p className="text-sm text-zinc-400">
              {selectedProgram === 'custom' ? 'Custom' : PROGRAMS[selectedProgram]?.name}
            </p>
            <p className="text-xs text-zinc-600">{state.breathCount} breaths</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-mono tabular-nums">{formatTime(Math.max(0, sessionElapsed))}</p>
            <p className="text-xs text-zinc-600">of {formatTime(getTotalDuration())}</p>
          </div>
        </div>

        <div role="status" aria-live="polite" className="sr-only">
          {getPhaseText()}: {phaseRemaining} seconds remaining
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          {state.phase === 'prepare' ? (
            <div className="text-center">
              <p className="text-7xl font-light mb-4">{Math.ceil(state.prepareTime / 1000)}</p>
              <p className="text-zinc-500 text-sm uppercase tracking-wider">Prepare to begin</p>
            </div>
          ) : (
            <>
              <div className="mb-12">
                {renderBreathRing()}
              </div>

              <div className="text-center space-y-4">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                  {getPhaseText()}
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

        <div className="p-6 flex justify-center gap-4 border-t border-zinc-900">
          {state.phase !== 'prepare' && (
            <>
              <button
                onClick={() => dispatch({ type: 'TOGGLE_PAUSE', now: performance.now() })}
                className="flex items-center justify-center w-14 h-14 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors border border-zinc-800"
                aria-label={state.isActive ? 'Pause' : 'Resume'}
              >
                {state.isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <button
                onClick={() => {
                  dispatch({ type: 'RESET' });
                  setMode('select');
                }}
                className="flex items-center justify-center w-14 h-14 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors border border-zinc-800"
                aria-label="Reset"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
}

export default App;