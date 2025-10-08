export const PROGRAMS = {
  foundation: {
    name: "Foundation",
    description: "Balanced box breathing to set a steady baseline.",
    duration: 5,
    instructions: `What it is: Equal four-phase nasal breathing (4-4-4-4) to settle pace and mechanics.
How: Sit tall, breathe low into ribs/belly, keep jaw/shoulders relaxed. Smooth, silent transitions; no forcing.`,
    sequences: [
      { kind: "static", minutes: 5, pattern: { inhale: 4, hold: 4, exhale: 4, rest: 4 }, description: "Box breathing (4-4-4-4)" }
    ]
  },

  retention: {
    name: "Retention (8-16-8-8)",
    description: "Steady holds with warm-up and a short recovery finish.",
    duration: 12,
    instructions: `What it is: Breath-hold cycles at a 1:2:1:1 ratio. Aim for comfortable, repeatable holds.
How: Stay relaxed; no chest/neck bracing or throat squeeze. If urge-to-breathe jumps, shorten the next hold or skip to recovery.`,
    sequences: [
      { kind: "static", minutes: 2, pattern: { inhale: 4, hold: 4, exhale: 4, rest: 4 }, description: "Warm-up box (4-4-4-4)" },
      { kind: "static", minutes: 3, pattern: { inhale: 6, hold: 12, exhale: 6, rest: 6 }, description: "Set 1 (6-12-6-6)" },
      { kind: "static", minutes: 4, pattern: { inhale: 8, hold: 16, exhale: 8, rest: 8 }, description: "Main set (8-16-8-8)" },
      { kind: "static", minutes: 3, pattern: { inhale: 5.5, hold: 0, exhale: 5.5, rest: 0 }, description: "Recovery: easy in/out (~5.5s)" }
    ]
  },

  endurance: {
    name: "Endurance",
    description: "Progressive holds with built-in breath recovery.",
    duration: 12,
    instructions: `What it is: Stepwise retention practice to extend comfort without strain.
How: Keep breaths quiet and low; face soft, neck loose. Use the recovery block whenever form slips.`,
    sequences: [
      { kind: "static", minutes: 2, pattern: { inhale: 4, hold: 4, exhale: 4, rest: 4 }, description: "Warm-up box (4-4-4-4)" },
      { kind: "static", minutes: 3, pattern: { inhale: 6, hold: 12, exhale: 6, rest: 6 }, description: "Set 1 (6-12-6-6)" },
      { kind: "static", minutes: 1, pattern: { inhale: 5.5, hold: 0, exhale: 5.5, rest: 0 }, description: "Recovery: easy in/out (~5.5s)" },
      { kind: "static", minutes: 4, pattern: { inhale: 8, hold: 16, exhale: 8, rest: 8 }, description: "Set 2 (8-16-8-8)" },
      { kind: "static", minutes: 2, pattern: { inhale: 4, hold: 0, exhale: 8, rest: 0 }, description: "Downshift: long exhale (4-0-8-0)" }
    ]
  },

  mastery: {
    name: "Mastery",
    description: "Longer, calm cycles with an optional extension.",
    duration: 15,
    instructions: `What it is: Steady retention work with slightly longer ratios—never max effort.
How: Zero strain in face/neck. Shoulders heavy, breathing low and quiet. If lightheaded, skip a round and use recovery.`,
    sequences: [
      { kind: "static", minutes: 2, pattern: { inhale: 4, hold: 4, exhale: 4, rest: 4 }, description: "Prep box (4-4-4-4)" },
      { kind: "static", minutes: 4, pattern: { inhale: 8, hold: 16, exhale: 8, rest: 8 }, description: "Baseline (8-16-8-8)" },
      { kind: "static", minutes: 1, pattern: { inhale: 5.5, hold: 0, exhale: 5.5, rest: 0 }, description: "Recovery: easy in/out" },
      { kind: "static", minutes: 5, pattern: { inhale: 10, hold: 20, exhale: 10, rest: 10 }, description: "Optional extension (10-20-10-10)" },
      { kind: "static", minutes: 3, pattern: { inhale: 4, hold: 0, exhale: 8, rest: 0 }, description: "Cool-down: long exhale" }
    ]
  },

  coherent: {
    name: "Coherent",
    description: "Slow, even nasal breathing; no holds.",
    duration: 10,
    instructions: `What it is: ~5.5 breaths/min for a smooth, steady rhythm.
How: In through the nose, out through the nose. Let lower ribs lead. Keep it unhurried and silent.`,
    sequences: [
      { kind: "static", minutes: 10, pattern: { inhale: 5.5, hold: 0, exhale: 5.5, rest: 0 }, description: "Steady rhythm (~5.5s in / ~5.5s out)" }
    ]
  },

  calming: {
    name: "Calming",
    description: "Extended exhales to settle quickly.",
    duration: 8,
    instructions: `What it is: Simple pattern with a long, unhurried exhale; optional small top-up inhale.
How: Gentle nasal inhale, small top-up if you like, then exhale slowly. Keep shoulders relaxed.`,
    sequences: [
      { kind: "static", minutes: 8, pattern: { inhale: 4, hold: 2, exhale: 8, rest: 0 }, description: "Extended exhale (4-2-8-0)" }
    ]
  }
};

export const SAFETY_WARNING =
  "⚠️ Safety: Don’t practice holds near water, while driving, or standing. Skip if you feel unwell. Avoid if pregnant or with heart/lung/neurological issues unless cleared by a clinician. Stop if dizzy, tingly, or uncomfortable. Keep holds easy; use recovery anytime.";