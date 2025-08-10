import React, { useEffect, useRef, useState } from 'react';
import EQ from './EQ';
import { PRESETS as BASE_PRESETS } from '../utils/presets';

const MAX_BIQUAD_FREQ = 24000;
const EQ_FREQS = [5, 11, 25, 56, 125, 280, 626, 1399, 3129, 6998, 15650, 35000].map(f => Math.min(f, MAX_BIQUAD_FREQ));

function loadLocal(key, fallback) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback } catch { return fallback }
}
function saveLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}


// Helper to get presets from localStorage (including custom)
function getPresets() {
  const custom = loadLocal('eq_custom', null);
  if (custom && Array.isArray(custom) && custom.length === 12) {
    return { ...BASE_PRESETS, Custom: custom };
  }
  return { ...BASE_PRESETS };
}

export default function Player({ station, onClose, toggleFavorite, isFavorite, setVisBg, setAnalyserRef, setAudioCtxFromApp, recentlyPlayed = [] }) {
  const audioRef = useRef(null);
  const [audioCtx, setAudioCtx] = useState(null);
  const sourceRef = useRef(null);
  const filtersRef = useRef([]);
  const analyserRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [gains, setGains] = useState(loadLocal('eq_gains', Array(EQ_FREQS.length).fill(0)));
  const [volume, setVolume] = useState(() => loadLocal('player_volume', 0.8));
  const [muted, setMuted] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(loadLocal('eq_preset', 'Flat'));
  const [presets, setPresets] = useState(getPresets());
  const [useProxy, setUseProxy] = useState(loadLocal('use_proxy', false));
  // Only vertical EQ sliders now
  const [audioKey, setAudioKey] = useState(0); // force remount audio element

  useEffect(() => saveLocal('eq_gains', gains), [gains]);
  useEffect(() => saveLocal('eq_preset', selectedPreset), [selectedPreset]);
  useEffect(() => saveLocal('use_proxy', useProxy), [useProxy]);
  // Update presets if custom changes
  useEffect(() => {
    setPresets(getPresets());
  }, []);
  // No need to save slider orientation

  useEffect(() => {
    if (setAudioCtxFromApp) setAudioCtxFromApp(audioCtx);
    return () => {
      if (audioCtx) {
        audioCtx.close().catch(() => {});
      }
    };
  }, [audioCtx, setAudioCtxFromApp]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
    saveLocal('player_volume', volume);
  }, [volume]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    if (!station) return;
    setAudioKey(k => k + 1); // force new <audio> element for each station
  }, [station, useProxy]);

  // Restore volume after audio element remounts
  useEffect(() => {
    if (!audioRef.current) return;
    const saved = loadLocal('player_volume', 0.8);
    audioRef.current.volume = saved;
    setVolume(saved);
  }, [audioKey]);

  useEffect(() => {
    if (!station || !audioRef.current) return;

    const url = station.url_resolved || station.url;
    let didCancel = false;

    // --- OPTIMIZED CLEANUP AND AUDIO GRAPH SETUP ---
    (async () => {
      // --- CLEANUP PREVIOUS AUDIO GRAPH ---
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
        audioRef.current.oncanplay = null;
      }
      if (sourceRef.current) {
        try { sourceRef.current.disconnect(); } catch (err) {}
        sourceRef.current = null;
      }
      if (filtersRef.current && filtersRef.current.length) {
        filtersRef.current.forEach(f => { try { f.disconnect(); } catch {} });
        filtersRef.current = [];
      }
      if (analyserRef.current) {
        try { analyserRef.current.disconnect(); } catch {}
        analyserRef.current = null;
      }
      if (setAnalyserRef) setAnalyserRef(null);
      if (audioCtx && audioCtx.state !== 'closed') {
        try { await audioCtx.close(); } catch {}
        setAudioCtx(null);
      }

      // --- CREATE NEW AUDIO GRAPH ---
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        setAudioCtx(ctx);
        if (setAudioCtxFromApp) setAudioCtxFromApp(ctx);

        audioRef.current.src = useProxy ? `/api/proxy?url=${encodeURIComponent(url)}` : url;
        audioRef.current.crossOrigin = "anonymous";

        // Only create one MediaElementSourceNode per audio element
        const source = ctx.createMediaElementSource(audioRef.current);
        sourceRef.current = source;

        const filters = EQ_FREQS.map((f) => {
          const filter = ctx.createBiquadFilter();
          filter.type = 'peaking';
          filter.frequency.value = f;
          filter.Q.value = 1.0;
          filter.gain.value = 0;
          return filter;
        });
        filtersRef.current = filters;

        let prev = source;
        filters.forEach((filter) => { prev.connect(filter); prev = filter; });

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        prev.connect(analyser);
  analyserRef.current = analyser;
  if (setAnalyserRef) setAnalyserRef({ current: analyser });

        const masterGain = ctx.createGain();
        masterGain.gain.value = 1;
        analyser.connect(masterGain);
        masterGain.connect(ctx.destination);

        // Apply existing EQ gains
        gains.forEach((gain, index) => {
          if (filters[index]) filters[index].gain.value = gain;
        });

        // Wait for the audio element to be ready, then play
        audioRef.current.load();
        audioRef.current.oncanplay = async () => {
          if (didCancel) return;
          try {
            if (ctx.state === 'suspended') {
              await ctx.resume();
            }
            await audioRef.current.play();
            setPlaying(true);
          } catch (err) {
            setPlaying(false);
            console.error('Error playing stream:', err);
            if (err.name === 'NotSupportedError') {
              alert('The selected stream is not supported by your browser. Please try another station.');
            }
          }
        };
      } catch (err) {
        setPlaying(false);
        console.error('Error initializing audio graph or playing stream:', err);
        if (err.name === 'NotSupportedError') {
          alert('The selected stream is not supported by your browser. Please try another station.');
        }
      }
    })();

    // Cleanup
    return () => {
      didCancel = true;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
        audioRef.current.oncanplay = null;
      }
      if (sourceRef.current) {
        try { sourceRef.current.disconnect(); } catch (err) {}
        sourceRef.current = null;
      }
      if (filtersRef.current && filtersRef.current.length) {
        filtersRef.current.forEach(f => { try { f.disconnect(); } catch {} });
        filtersRef.current = [];
      }
      if (analyserRef.current) {
        try { analyserRef.current.disconnect(); } catch {}
        analyserRef.current = null;
      }
      if (setAnalyserRef) setAnalyserRef(null);
      if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close().catch(() => {});
        setAudioCtx(null);
      }
    };
  }, [audioKey]);

  const ensureAudioGraph = async () => {
    if (!audioRef.current) return;
    if (audioCtx) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    setAudioCtx(ctx);
    if (setAudioCtxFromApp) setAudioCtxFromApp(ctx);
    const source = ctx.createMediaElementSource(audioRef.current);
    sourceRef.current = source;
    const filters = EQ_FREQS.map((f) => {
      const filter = ctx.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = f;
      filter.Q.value = 1.0;
      filter.gain.value = 0;
      return filter;
    });
    let prev = source;
    filters.forEach(f => {
      prev.connect(f);
      prev = f;
    });
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    prev.connect(analyser);
    analyserRef.current = analyser;
    const master = ctx.createGain();
    master.gain.value = 1;
    analyser.connect(master);
    master.connect(ctx.destination);
    filtersRef.current = filters;

    // apply any existing gains to the filters
    gains.forEach((g, i) => {
      if (filtersRef.current[i]) filtersRef.current[i].gain.value = g;
    });
  };

  const handlePlay = async () => {
    try {
      if (!audioRef.current) return;
      await ensureAudioGraph();
      await audioRef.current.play();
      if (audioCtx && audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      setPlaying(true);
    } catch (err) {
      console.error('Play failed', err);
      alert('Unable to play stream (codec/CORS or stream unavailable).');
      setPlaying(false);
    }
  };
  const handlePause = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setPlaying(false);
  };

  const setBandGain = (index, db) => {
    setGains(prev => {
      const next = [...prev]; next[index] = db;
      if (filtersRef.current[index]) filtersRef.current[index].gain.value = db;
      return next;
    });
  };

  const applyPreset = (presetName) => {
    const preset = presets[presetName] || presets.Flat;
    setSelectedPreset(presetName);
    setGains(preset);
    // apply to filters if already created
    preset.forEach((db, i) => {
      if (filtersRef.current[i]) filtersRef.current[i].gain.value = db;
    });
  };

  // Save current gains as custom preset
  const saveCustomPreset = () => {
    saveLocal('eq_custom', gains);
    setPresets(getPresets());
    setSelectedPreset('Custom');
  };

  // ensure initial preset applied on load
  useEffect(() => {
    applyPreset(selectedPreset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold">{station ? station.name : 'No station selected'}</div>
          <div className="text-xs text-gray-400">{station ? `${station.country} • ${station.codec} • ${station.bitrate} kbps` : 'Select a station to play'}</div>
        </div>
        <div className="flex items-center gap-2">
          {station && (
            <>
              <button onClick={() => toggleFavorite(station)} className={`px-3 py-1 rounded ${isFavorite ? 'bg-yellow-400 text-black' : 'glass'}`}>
                {isFavorite ? '★' : '☆'}
              </button>
              {playing ? (
                <button onClick={handlePause} className="px-3 py-1 rounded glass">Pause</button>
              ) : (
                <button onClick={handlePlay} className="px-3 py-1 rounded glass">Play</button>
              )}
            </>
          )}
          <button onClick={onClose} className="px-2 py-1 rounded glass">Close</button>
        </div>
      </div>

  {/* Visualization is now handled by App, not Player */}


      <div className="mt-4">
        <div className="flex flex-col gap-4">
          {/* Volume and Mute */}
          <div className="flex items-center gap-3 bg-white/30 dark:bg-black/30 backdrop-blur rounded-lg px-3 py-2">
            <label className="text-xs font-medium">Volume</label>
            <input type="range" min="0" max="1" step="0.01" value={volume} onChange={e => setVolume(parseFloat(e.target.value))} className="flex-1 accent-blue-500" />
            <label className="ml-2 text-xs flex items-center gap-1"><input type="checkbox" checked={muted} onChange={e => setMuted(e.target.checked)} /> Muted</label>
          </div>

          {/* EQ Preset, Reset, Proxy, Sliders */}
          <div className="flex flex-col gap-2 bg-white/30 dark:bg-black/30 backdrop-blur rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 w-full">
              <label className="text-xs font-medium whitespace-nowrap mr-1">EQ Preset</label>
              <select
                value={selectedPreset}
                onChange={e => applyPreset(e.target.value)}
                className="rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 transition shadow"
                style={{
                  minWidth: 90,
                  background: 'var(--glass-bg, rgba(255,255,255,0.35))',
                  color: 'var(--glass-fg, #1e293b)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  boxShadow: '0 8px 32px 0 rgba(31,38,135,0.10)',
                  borderRadius: '0.75rem',
                  transition: 'background 0.2s, color 0.2s',
                }}
              >
                {/* glassmorphism theme effect is handled at the top of the component with useEffect */}
                {Object.keys(presets).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
              <button
                onClick={() => applyPreset('Flat')}
                className="ml-2 px-2 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                title="Reset EQ to Flat"
              >
                Reset
              </button>
              <button
                onClick={saveCustomPreset}
                className="ml-2 px-2 py-1 rounded-lg bg-green-600 text-white text-xs font-semibold shadow hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 transition"
                title="Save as Custom Preset"
              >
                Save
              </button>
            </div>
            <div className="flex items-center gap-2 w-full">
              <label className="text-xs font-medium">Use proxy</label>
              <input type="checkbox" checked={useProxy} onChange={e => setUseProxy(e.target.checked)} className="accent-blue-500" />
              {/* Sliders orientation removed, always vertical */}
              <span className="text-xs text-gray-400 ml-auto">Range: -12 dB → +12 dB</span>
            </div>
          </div>

          {/* EQ Sliders */}
          <div className="mt-1">
            <EQ freqs={EQ_FREQS} gains={gains} setBandGain={setBandGain} orientation="vertical" />
          </div>
        </div>
      </div>


      {/* Recently Played List */}
      {recentlyPlayed.length > 0 && (
        <div className="mt-6">
          <div className="font-semibold text-sm mb-2 opacity-80">Recently Played</div>
          <ul className="space-y-1">
            {recentlyPlayed.map(st => (
              <li key={st.stationuuid} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/20 dark:bg-black/20 backdrop-blur-sm hover:bg-white/30 dark:hover:bg-black/30 transition cursor-pointer"
                  onClick={() => st.stationuuid !== station?.stationuuid && st.name && onClose ? onClose() || setTimeout(() => window.dispatchEvent(new CustomEvent('select-station', { detail: st })), 0) : undefined}>
                <span className="truncate flex-1" title={st.name}>{st.name}</span>
                <span className="text-xs text-gray-400">{st.country}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <audio key={audioKey} ref={audioRef} />

    </div>
  );
}

