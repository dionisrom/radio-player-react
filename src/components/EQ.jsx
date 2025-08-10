import React from 'react'

export default function EQ({freqs, gains, setBandGain}) {
  // Use a single accent color for all sliders
  const accent = '#06b6d4'; // Tailwind cyan-500
  return (
    <div className="p-3 glass rounded-xl">
      <div className="text-sm mb-2">12-band EQ</div>
      <div className="flex items-end justify-between gap-0 py-2 w-full">
        {freqs.map((f, i) => (
          <div key={i} className="flex flex-col items-center flex-1 min-w-0">
            <input
              type="range"
              min={-12}
              max={12}
              step={0.5}
              value={gains[i]}
              onChange={(e) => setBandGain(i, parseFloat(e.target.value))}
              className="eq-vertical-slider transition-all duration-200"
              style={{
                accentColor: accent,
                writingMode: 'vertical-lr',
                direction: 'rtl',
                height: '144px',
                width: '1.25rem',
                margin: 0
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
