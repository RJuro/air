import { Plus } from 'lucide-react';

export default function NumberField({ label, value, onChange, min = 0, max = 120, step = 1 }) {
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