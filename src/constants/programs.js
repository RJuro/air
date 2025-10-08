export const PROGRAMS = {
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

export const SAFETY_WARNING = "⚠️ Safety: Never practice breath retention near water, while driving, or if you have cardiovascular conditions. Stop immediately if you feel dizzy or uncomfortable. Consult a healthcare professional before starting any breath work practice.";