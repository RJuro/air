export const createInitialState = () => ({
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

export function breathReducer(state, action) {
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
          phaseStartTime: state.phaseStartTime + pausedMs
        };
      }
    }
    case 'NEXT_PHASE': {
      const phases = state.pattern?.rest > 0
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
      return createInitialState();
    case 'UPDATE_PREPARE':
      return { ...state, prepareTime: action.prepareTime };
    case 'FORCE_PHASE': {
      const nextState = {
        ...state,
        phase: action.phase,
        phaseStartTime: action.now
      };
      if (!state.isActive && state.pauseStartedAt !== null) {
        nextState.pauseStartedAt = action.now;
      }
      return nextState;
    }
    default:
      return state;
  }
}
