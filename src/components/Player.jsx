import React, { useEffect, useRef, useState } from 'react';
import EQ from './EQ';
import { PRESETS as BASE_PRESETS } from '../utils/presets';
import Select from 'react-select';
import selectStyles from '../utils/selectStyles';
import Hls from 'hls.js';

const MAX_BIQUAD_FREQ = 24000;
const EQ_FREQS = [5, 11, 25, 56, 125, 280, 626, 1399, 3129, 6998, 15650, 35000].map(f => Math.min(f, MAX_BIQUAD_FREQ));

// Normalize a stream/title string into a consistent "Artist — Title" display when possible
function formatStreamTitle(raw) {
  try {
    if (!raw) return '';
    let s = String(raw).replace(/\u0000/g, '').replace(/\s+/g, ' ').trim();
    if (!s) return '';

    // Common separators used by streams: ' - ', ' — ', ' – ', ' | ', ' / ' etc.
    const seps = [' - ', ' — ', ' – ', ' | ', ' / ', '\\u2014', '\\u2013'];
    for (const sep of seps) {
      if (s.indexOf(sep) >= 0) {
        const parts = s.split(sep).map(p => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          // Assume parts[0] = artist, parts[1] = title (common convention). If reversed it will still be informative.
          return `${parts[0]} — ${parts.slice(1).join(` ${sep.trim()} `)}`;
        }
      }
    }

    // Try simple regex like "Artist: Title" or "Title - Artist" patterns
    const colonMatch = s.match(/^([^:]+):\s*(.+)$/);
    if (colonMatch) return `${colonMatch[1].trim()} — ${colonMatch[2].trim()}`;

    // If no clear separator, return original trimmed string
    return s;
  } catch (e) {
    return String(raw || '').trim();
  }
}

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

export default function Player({ station, onClose, toggleFavorite, isFavorite, setVisBg, setAnalyserRef, setAudioCtxFromApp, recentlyPlayed = [], registerControls = null, setPlayingOnApp = null, setNowPlaying = null, onStreamError = null, theme = 'dark' }) {
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
  const [streamError, setStreamError] = useState('');
  // Only vertical EQ sliders now
  const [audioKey, setAudioKey] = useState(0); // force remount audio element
  const hlsRef = useRef(null);
  const metaEsRef = useRef(null);
  const userStoppedRef = useRef(false);

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

  // Keep Player state in sync if the underlying audio element dispatches volumechange
  // (this can happen if other code manipulates the element directly). We cannot
  // detect or control OS-level hardware volume from the browser; this keeps the
  // in-app UI synchronized with the HTMLMediaElement volume property.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onVolumeChange = () => {
      const v = typeof el.volume === 'number' ? el.volume : 0;
      // Only update if different to avoid unnecessary re-renders
      setVolume(prev => (Math.abs(prev - v) > 0.0005 ? v : prev));
    };
    el.addEventListener('volumechange', onVolumeChange);
    return () => {
      try { el.removeEventListener('volumechange', onVolumeChange); } catch (e) {}
    };
    // Re-run when audio element is remounted (audioKey forces remount)
  }, [audioKey]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.muted = muted;
  }, [muted]);

  // Notify parent about stream error changes
  useEffect(() => {
    if (typeof onStreamError === 'function') onStreamError(streamError || '');
  }, [streamError, onStreamError]);

  useEffect(() => {
    if (!station) return;
  userStoppedRef.current = false;
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
            // If the user explicitly stopped playback recently, don't auto-play here.
            if (userStoppedRef.current) {
              // keep playing state false and do not start playback
              setPlaying(false);
              if (setPlayingOnApp) setPlayingOnApp(false);
              return;
            }
            await audioRef.current.play();
            setPlaying(true);
            // Clear any stream errors once playback succeeds
            setStreamError('');
            if (setPlayingOnApp) setPlayingOnApp(true);
            // If the stream doesn't provide metadata immediately, show the station name
            try {
              if (setNowPlaying) {
                // Only set fallback if there's no existing nowPlaying text
                setNowPlaying(prev => (prev && prev.length > 0) ? prev : (station && (station.name || station.title || station.stationuuid) ? (station.name || station.title || station.stationuuid) : ''));
              }
            } catch (e) {}
          } catch (err) {
            setPlaying(false);
            if (setPlayingOnApp) setPlayingOnApp(false);
            if (setNowPlaying) setNowPlaying('');
            // Autoplay/blocking errors are common on page load. Log as warnings and
            // don't show alerts to avoid spamming the user.
            if (err && err.name === 'NotAllowedError') {
              console.warn('Autoplay blocked by browser policy:', err.message || err);
            } else if (err && err.name === 'NotSupportedError') {
              console.warn('The selected stream is not supported by your browser:', err.message || err);
            } else {
              console.warn('Error playing stream:', err);
              // Surface a user-friendly message for play errors
              try {
                if (err && err.name === 'NotAllowedError') {
                  setStreamError('Playback was blocked by the browser (autoplay policy). Please interact with the page and try again.');
                } else if (err && err.name === 'NotSupportedError') {
                  setStreamError('The selected stream format is not supported by your browser. Try another station or enable the proxy.');
                } else {
                  setStreamError(String(err && (err.message || err)) || 'Unknown playback error');
                }
              } catch (e) {}
            }
          }
        };
    } catch (err) {
  setPlaying(false);
  if (setPlayingOnApp) setPlayingOnApp(false);
  if (setNowPlaying) setNowPlaying('');
        console.error('Error initializing audio graph or playing stream:', err);
        if (err.name === 'NotSupportedError') {
          setStreamError('The selected stream is not supported by your browser. Please try another station or enable the proxy.');
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

  // Subscribe to ICY metadata (server meta SSE) and HLS ID3 when station changes
  useEffect(() => {
    // cleanup prev
    if (metaEsRef.current) { try { metaEsRef.current.close(); } catch {} metaEsRef.current = null }
    if (hlsRef.current) { try { hlsRef.current.destroy(); } catch {} hlsRef.current = null }

    const url = station ? (station.url_resolved || station.url) : null;
    if (!url) return;

    // HLS ID3 handling for .m3u8 streams (client-side via hls.js)
    if (url.toLowerCase().includes('.m3u8') && typeof Hls !== 'undefined' && Hls.isSupported()) {
      try {
        const hls = new Hls();
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(audioRef.current);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          // manifest parsed; do not auto-play here — Player handles play
        });
        hls.on(Hls.Events.FRAG_PARSING_METADATA, (event, data) => {
          try {
            if (!data || !data.samples) return;
            for (const sample of data.samples) {
              try {
                // Convert Uint8Array to Blob for jsmediatags
                const blob = new Blob([sample.data.buffer || sample.data], { type: 'audio/mpeg' });
                // Dynamically load jsmediatags UMD build to parse ID3 frames in the browser.
                try {
                  import('jsmediatags/dist/jsmediatags.min.js').then((jsmediatags) => {
                    const reader = jsmediatags && (jsmediatags.default || jsmediatags);
                    if (reader && reader.read) {
                      reader.read(blob, {
                        onSuccess: function(tag) {
                          const title = (tag.tags && (tag.tags.title || tag.tags.TIT2)) || '';
                          const artist = (tag.tags && (tag.tags.artist || tag.tags.TPE1)) || '';
                          const display = artist && title ? `${artist} — ${title}` : (title || artist || '');
                          const formatted = formatStreamTitle(display);
                          if (formatted && setNowPlaying) setNowPlaying(formatted);
                        },
                        onError: function(err) {
                          try {
                            const str = new TextDecoder('utf-8').decode(sample.data);
                            const formatted = formatStreamTitle(str);
                            if (setNowPlaying) setNowPlaying(formatted);
                          } catch (e) {}
                        }
                      });
                    } else {
                      try {
                        const str = new TextDecoder('utf-8').decode(sample.data);
                        const formatted = formatStreamTitle(str);
                        if (setNowPlaying) setNowPlaying(formatted);
                      } catch (e) {}
                    }
                  }).catch(err => {
                    try {
                      const str = new TextDecoder('utf-8').decode(sample.data);
                      if (setNowPlaying) setNowPlaying(str.replace(/\0+/g, '').trim());
                    } catch (e) {}
                  });
                } catch (err) {
                  try {
                    const str = new TextDecoder('utf-8').decode(sample.data);
                    if (setNowPlaying) setNowPlaying(str.replace(/\0+/g, '').trim());
                  } catch (e) {}
                }
              } catch (err) {
                console.warn('Error parsing HLS ID3 sample', err);
              }
            }
          } catch (e) { console.warn('Error parsing HLS ID3 sample', e); }
        });
        // Surface HLS errors to the user. For fatal errors, show a message and
        // suggest enabling the proxy which often helps with CORS/network issues.
        hls.on(Hls.Events.ERROR, (event, data) => {
          try {
            console.warn('HLS error', data);
            if (data && data.fatal) {
              let message = 'HLS playback error.';
              const t = data.type;
              if (t === Hls.ErrorTypes.NETWORK_ERROR) message = 'Network error while fetching HLS segments (possible CORS or server unreachable).';
              else if (t === Hls.ErrorTypes.MEDIA_ERROR) message = 'Media decoding error during HLS playback.';
              else if (t === Hls.ErrorTypes.OTHER_ERROR) message = 'Playback error while handling the stream.';
              setStreamError(message + (useProxy ? '' : ' Try enabling "Use proxy" to work around CORS or network issues.'));
              setPlaying(false);
              if (setPlayingOnApp) setPlayingOnApp(false);
            }
          } catch (e) { console.warn(e); }
        });
      } catch (err) {
        console.warn('HLS setup failed', err);
      }
    }

    // For non-HLS streams, use server-side ICY metadata via SSE endpoint
    try {
      const es = new EventSource(`/api/meta?url=${encodeURIComponent(url)}`);
      metaEsRef.current = es;
      es.addEventListener('metadata', (e) => {
        try {
          const payload = JSON.parse(e.data);
          const streamTitle = payload.streamTitle || '';
          const formatted = formatStreamTitle(streamTitle);
          if (setNowPlaying) setNowPlaying(formatted);
        } catch (err) {}
      });
      es.addEventListener('nometadata', () => {
        if (setNowPlaying) setNowPlaying('');
      });
      es.onerror = () => { /* ignore, EventSource will reconnect */ };
    } catch (err) {
      // ignore
    }

    return () => {
      if (metaEsRef.current) { try { metaEsRef.current.close(); } catch {} metaEsRef.current = null }
      if (hlsRef.current) { try { hlsRef.current.destroy(); } catch {} hlsRef.current = null }
      // Keep nowPlaying intact across short re-initializations; parent (App) or explicit stop
      // will clear it when needed. This avoids brief overwrites when playback starts.
    };
  }, [station && (station.url_resolved || station.url)]);

  // Attach audio element error listeners (CORS/network/media errors)
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onError = () => {
      try {
        const me = el.error;
        if (!me) {
          setStreamError('Unknown audio playback error.');
          return;
        }
        // Map media error codes to helpful messages
        let msg = '';
        switch (me.code) {
          case me.MEDIA_ERR_ABORTED:
            msg = 'Playback was aborted.';
            break;
          case me.MEDIA_ERR_NETWORK:
            msg = 'Network error while fetching the stream (possible CORS or server unreachable).';
            break;
          case me.MEDIA_ERR_DECODE:
            msg = 'Decoding error (corrupted stream or unsupported codecs).';
            break;
          case me.MEDIA_ERR_SRC_NOT_SUPPORTED:
            msg = 'Stream not supported by your browser (CORS or unsupported format). Try enabling the proxy.';
            break;
          default:
            msg = 'An unknown playback error occurred.';
        }
        setStreamError(msg + (useProxy ? '' : ' You can try enabling "Use proxy" to bypass CORS or network restrictions.'));
        setPlaying(false);
        if (setPlayingOnApp) setPlayingOnApp(false);
        if (setNowPlaying) setNowPlaying('');
      } catch (e) { console.warn('Error handling media error', e); }
    };

    const onPlaying = () => { setStreamError(''); };
    const onStalled = () => { setStreamError('Stream stalled — network may be unreliable.'); };

    el.addEventListener('error', onError);
    el.addEventListener('playing', onPlaying);
    el.addEventListener('stalled', onStalled);

    return () => {
      try { el.removeEventListener('error', onError); el.removeEventListener('playing', onPlaying); el.removeEventListener('stalled', onStalled); } catch (e) {}
    };
  }, [audioKey, station, useProxy]);

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
      if (!audioRef.current) return false;
      await ensureAudioGraph();

      // ensure audio context resumed first
      if (audioCtx && audioCtx.state === 'suspended') {
        try { await audioCtx.resume(); } catch (e) { /* ignore */ }
      }

      // final check for src
      if (!audioRef.current.src) {
        console.warn('No audio source to play');
        return false;
      }

  // Clear any user-stopped guard so play proceeds
  userStoppedRef.current = false;
  await audioRef.current.play();
  setPlaying(true);
  if (setPlayingOnApp) setPlayingOnApp(true);
      // Fallback nowPlaying when play invoked programmatically
      try {
        if (setNowPlaying) {
          setNowPlaying(prev => (prev && prev.length > 0) ? prev : (station && (station.name || station.title || station.stationuuid) ? (station.name || station.title || station.stationuuid) : ''));
        }
      } catch (e) {}
      return true;
    } catch (err) {
      // Better error messages for common cases
      if (err && err.name === 'NotAllowedError') {
        // Autoplay blocked by browser policy
        console.warn('Playback blocked by browser autoplay policy:', err.message || err);
        // do not spam console.error; let caller decide what UI to show
        setPlaying(false);
        return false;
      }
      if (err && err.name === 'NotSupportedError') {
        console.warn('Stream not supported by this browser:', err.message || err);
        setPlaying(false);
        return false;
      }
      console.warn('Play failed', err);
  setPlaying(false);
  if (setPlayingOnApp) setPlayingOnApp(false);
      return false;
    }
  };
  const handleStop = () => {
    if (!audioRef.current) return;
    // Pause and fully reset audio element and audio graph
  // Mark that the user explicitly stopped playback so auto-play won't restart
  userStoppedRef.current = true;
    audioRef.current.pause();
    audioRef.current.removeAttribute('src');
    audioRef.current.load();
  setPlaying(false);
  if (setPlayingOnApp) setPlayingOnApp(false);
  // Force remount of the audio element so we won't try to create a new
  // MediaElementSourceNode for the same HTMLMediaElement (which causes
  // InvalidStateError). Incrementing audioKey replaces the element.
  setAudioKey(k => k + 1);
    // cleanup audio graph
  // close any metadata connections (SSE or HLS) so they don't set state after stop
  if (metaEsRef.current) { try { metaEsRef.current.close(); } catch {} metaEsRef.current = null }
  if (hlsRef.current) { try { hlsRef.current.destroy(); } catch {} hlsRef.current = null }
  // clear now playing metadata
  if (setNowPlaying) setNowPlaying('');
  // disconnect audio nodes
  if (sourceRef.current) { try { sourceRef.current.disconnect(); } catch {} sourceRef.current = null }
  if (filtersRef.current && filtersRef.current.length) { filtersRef.current.forEach(f => { try { f.disconnect(); } catch {} }); filtersRef.current = [] }
  if (analyserRef.current) { try { analyserRef.current.disconnect(); } catch {} analyserRef.current = null }
  if (setAnalyserRef) setAnalyserRef(null);
  if (audioCtx && audioCtx.state !== 'closed') { audioCtx.close().catch(() => {}); setAudioCtx(null) }

  // Inform parent to clear selected station so Player won't re-initialize
  // Previously the parent was informed to clear `selected` which caused the
  // Player/aside to unmount and remount, producing a visible flicker. Keep the
  // selected station in the UI when stopping audio to avoid layout refreshes.
  };
  const handlePause = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
  setPlaying(false);
  if (setPlayingOnApp) setPlayingOnApp(false);
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

  // Expose controls to parent (Footer) if registerControls callback provided
  // Use refs to expose stable control wrappers to parent. We assign current handlers/values
  // into refs each render and register a single controls object once (or when registerControls changes).
  const playRef = useRef(() => {});
  const pauseRef = useRef(() => {});
  const stopRef = useRef(() => {});
  const playingRef = useRef(false);
  const setVolumeRef = useRef((v) => {});
  const setMutedRef = useRef((m) => {});
  const volumeRef = useRef(volume);
  const mutedRef = useRef(muted);

  // keep refs up to date every render
  playRef.current = handlePlay;
  pauseRef.current = handlePause;
  stopRef.current = handleStop;
  playingRef.current = playing;
  setVolumeRef.current = (v) => setVolume(Number(v));
  setMutedRef.current = (m) => setMuted(Boolean(m));
  volumeRef.current = volume;
  mutedRef.current = muted;

  useEffect(() => {
    if (!registerControls) return;
    const controls = {
      play: (...args) => playRef.current && playRef.current(...args),
      pause: (...args) => pauseRef.current && pauseRef.current(...args),
      stop: (...args) => stopRef.current && stopRef.current(...args),
      setVolume: (v) => setVolumeRef.current && setVolumeRef.current(v),
      setMuted: (m) => setMutedRef.current && setMutedRef.current(m),
  getPlaying: () => playingRef.current,
      getVolume: () => volumeRef.current,
      getMuted: () => mutedRef.current,
    getAudioContext: () => audioCtx,
    };
    registerControls(controls);
    return () => registerControls(null);
    // only re-register if the registration callback identity changes
  }, [registerControls, audioCtx]);



  return (
    <div>
      {/* Primary controls moved to persistent footer; aside shows advanced controls only */}
  {/* Visualization is now handled by App, not Player */}


      <div className="mt-4">
        <div className="flex flex-col gap-4">
          {/* Volume and Mute moved to persistent footer */}

          {/* EQ Preset, Reset, Proxy, Sliders */}
          <div className="flex flex-col gap-2 bg-white/30 dark:bg-black/30 backdrop-blur rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 w-full">
              <label className="text-xs font-medium whitespace-nowrap mr-1">EQ Preset</label>
              <div style={{ minWidth: 140 }}>
                <Select
                  value={{ value: selectedPreset, label: selectedPreset }}
                  onChange={opt => applyPreset(opt ? opt.value : 'Flat')}
                  options={Object.keys(presets).map(k => ({ value: k, label: k }))}
                  styles={selectStyles(theme)}
                  isSearchable={false}
                  menuPlacement="auto"
                  closeMenuOnSelect={true}
                  className="react-select-container"
                  classNamePrefix="select"
                  menuPortalTarget={typeof window !== 'undefined' ? window.document.body : undefined}
                />
              </div>
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

