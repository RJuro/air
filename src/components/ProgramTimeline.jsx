import { motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';

function ProgramTimeline({
  segments,
  progressValues,
  activeIndex,
  currentDescription,
  currentPatternLabel,
  onSkip,
  canSkip,
  reducedMotion
}) {
  if (!segments.length) return null;

  const transition = reducedMotion ? { duration: 0 } : { duration: 0.4, ease: 'easeOut' };

  return (
    <div className="w-full max-w-2xl mx-auto mb-10 space-y-3">
      <div className="flex items-center gap-4">
        <div className="flex-1 flex items-center gap-2">
          {segments.map((segment, idx) => {
            const fill = Math.min(1, Math.max(0, progressValues[idx] ?? 0));
            const isActive = idx === activeIndex;
            const trackClass = `relative flex-1 h-[6px] rounded-full overflow-hidden ${
              isActive ? 'bg-white/20' : 'bg-white/12'
            }`;
            return (
              <div
                key={segment.key ?? idx}
                className={trackClass}
                style={{ flexGrow: Math.max(segment.durationSec, 1), flexBasis: 0 }}
              >
                {idx > 0 && (
                  <div className="absolute -left-[3px] top-1/2 h-4 w-px -translate-y-1/2 bg-white/35" />
                )}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-white/85 via-white/90 to-white/75"
                  initial={false}
                  style={{ transformOrigin: 'left center' }}
                  animate={{ scaleX: fill }}
                  transition={transition}
                />
              </div>
            );
          })}
        </div>
        <div className="text-right min-w-[110px]">
          <p className="text-[10px] uppercase tracking-[0.35em] text-zinc-500/80">Pattern</p>
          <p className="text-sm font-mono text-white/90">{currentPatternLabel}</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-300/80">
        <p className="text-sm text-white/90 font-light truncate">{currentDescription}</p>
        {canSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-white/80 transition-colors hover:text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            <span>Skip</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

export default ProgramTimeline;
