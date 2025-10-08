export const phaseColors = {
  inhale: 'rgb(148, 190, 255)',
  hold:   'rgb(203, 186, 255)',
  exhale: 'rgb(129, 233, 197)',
  rest:   'rgb(178, 190, 210)',
  prepare:'rgb(244, 244, 245)',
  complete:'rgb(244, 244, 245)'
};

export const phaseGradientTheme = {
  inhale: { primary: [148, 190, 255], secondary: [88, 160, 255] },
  hold:   { primary: [203, 186, 255], secondary: [155, 134, 255] },
  exhale: { primary: [129, 233, 197], secondary: [92, 206, 176] },
  rest:   { primary: [178, 190, 210], secondary: [132, 140, 160] }
};

export const getPhaseText = (phase) => {
  const texts = {
    prepare: 'Prepare',
    inhale: 'Inhale',
    hold: 'Hold',
    exhale: 'Exhale',
    rest: 'Hold',
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
