export const phaseColors = {
  inhale: 'rgb(147, 197, 253)', // light blue
  hold:   'rgb(196, 181, 253)', // violet
  exhale: 'rgb(134, 239, 172)', // green
  rest:   'rgb(161, 161, 170)', // gray
  prepare:'rgb(244, 244, 245)',
  complete:'rgb(244, 244, 245)'
};

export const getPhaseText = (phase) => {
  const texts = {
    prepare: 'Prepare',
    inhale: 'Breathe In',
    hold: 'Hold',
    exhale: 'Breathe Out',
    rest: 'Rest',
    complete: 'Complete',
    ready: ''
  };
  return texts[phase] || '';
};

export const formatTime = (seconds) => {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const getPhaseSequence = (pattern) => {
  return pattern?.rest > 0 ? ['inhale', 'hold', 'exhale', 'rest'] : ['inhale', 'hold', 'exhale'];
};

// helpers
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export const rgbToArr = (rgb) => {
  // "rgb(r, g, b)" -> [r,g,b]
  const m = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!m) return [255,255,255];
  return [parseInt(m[1],10), parseInt(m[2],10), parseInt(m[3],10)];
};

export const arrToRgb = ([r,g,b]) => `rgb(${r|0}, ${g|0}, ${b|0})`;