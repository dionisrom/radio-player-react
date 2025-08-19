import React, { useEffect, useState, useRef } from 'react'

export default function FooterPlayer({ station, isFavorite, playerControls = null, toggleFavorite, playerPlaying = null, nowPlaying = '' }) {
  const [volume, setVolumeState] = useState(0.8);
  const [muted, setMutedState] = useState(false);
  const [playing, setPlayingState] = useState(false);
  const playingTimer = useRef(null);
  const [pulse, setPulse] = useState(false);
  const pulseTimer = useRef(null);

  // Sync initial values when playerControls become available
  useEffect(() => {
    if (!playerControls) return;
    try {
      const v = typeof playerControls.getVolume === 'function' ? playerControls.getVolume() : 0.8;
      const m = typeof playerControls.getMuted === 'function' ? playerControls.getMuted() : false;
  const p = typeof playerControls.getPlaying === 'function' ? playerControls.getPlaying() : false;
      setVolumeState(v);
      setMutedState(m);
      // initialize local playing state from the player controls if available
      setPlayingState(p);
    } catch (err) {
      // ignore
    }
  }, [playerControls]);

  // Sync playing state from App when Player notifies via prop
  useEffect(() => {
    if (typeof playerPlaying === 'boolean') {
      setPlayingState(playerPlaying);
    }
  }, [playerPlaying]);

  // When user changes UI, call into playerControls setters
  const handleSetVolume = (v) => {
    setVolumeState(v);
    if (playerControls && typeof playerControls.setVolume === 'function') playerControls.setVolume(v);
  };
  const handleSetMuted = (m) => {
    setMutedState(m);
    if (playerControls && typeof playerControls.setMuted === 'function') playerControls.setMuted(m);
    // trigger a short visual pulse on unmute to emphasize audio restoration
    if (!m) {
      if (pulseTimer.current) clearTimeout(pulseTimer.current);
      setPulse(true);
      pulseTimer.current = setTimeout(() => {
        setPulse(false);
        pulseTimer.current = null;
      }, 600);
    }
  };

  useEffect(() => {
    return () => {
      if (pulseTimer.current) clearTimeout(pulseTimer.current);
      if (playingTimer.current) clearTimeout(playingTimer.current);
    };
  }, []);

  // FooterPlayer no longer manages metadata subscription; App owns nowPlaying and passes it here.

  const handlePlay = () => playerControls && playerControls.play && playerControls.play()
  const handlePause = () => playerControls && playerControls.pause && playerControls.pause()
  const handleStop = () => playerControls && playerControls.stop && playerControls.stop()
  const handleToggleFav = () => toggleFavorite && station && toggleFavorite(station)

  // Toggle play/pause and keep local playing state in sync
  const handleTogglePlay = async () => {
    if (!playerControls) return;
    try {
      const isPlaying = typeof playerControls.getPlaying === 'function' ? playerControls.getPlaying() : false;
      if (isPlaying) {
        await playerControls.pause();
        setPlayingState(false);
      } else {
        await playerControls.play();
        setPlayingState(true);
      }
    } catch (err) {
      console.error('Toggle play failed', err);
    }
    // keep playing state in sync for a short time in case Player updates asynchronously
    if (playingTimer.current) clearTimeout(playingTimer.current);
    playingTimer.current = setTimeout(() => {
      if (playerControls && typeof playerControls.getPlaying === 'function') {
        setPlayingState(playerControls.getPlaying());
      }
      playingTimer.current = null;
    }, 300);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/20 dark:border-black/20 backdrop-blur-md py-2 px-4">
      <div className="max-w-6xl mx-auto flex items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className={`w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-md flex items-center justify-center text-white font-bold text-sm transform transition-all duration-300 ${pulse ? 'scale-105 ring-4 ring-blue-400/40 shadow-lg' : ''}`}>FM</div>
          <div className="truncate">
            <div className="font-medium text-sm">{station ? station.name : 'No station selected'}</div>
              {nowPlaying ? (
                <div className="text-xs text-gray-200 truncate">{nowPlaying}</div>
              ) : (
                <div className="text-xs text-gray-400 truncate">{station ? `${station.country} • ${station.codec} • ${station.bitrate} kbps` : 'Select a station to play'}</div>
              )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button onClick={handleTogglePlay} className="px-3 py-1 rounded glass" aria-label={playing ? 'Pause' : 'Play'} title={playing ? 'Pause' : 'Play'} aria-pressed={playing}>
              {playing ? (
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <button onClick={handleStop} className="px-3 py-1 rounded bg-red-600 text-white" aria-label="Stop" title="Stop">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M6 6h12v12H6z" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <input type="range" min="0" max="1" step="0.01" value={volume} onChange={e => handleSetVolume(Number(e.target.value))} className="w-36 accent-blue-500" />
            <button
              onClick={() => handleSetMuted(!muted)}
              className="px-2 py-1 rounded glass"
              aria-label={muted ? 'Unmute' : 'Mute'}
              title={muted ? 'Unmute' : 'Mute'}
              aria-pressed={muted}
            >
              {muted ? (
                // speaker with an X overlay
                <svg className="w-5 h-5 text-gray-200" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M5 9v6h4l5 4V5L9 9H5z" fill="currentColor" />
                  <path d="M18 8l4 4M22 8l-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                // simple speaker icon
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M5 9v6h4l5 4V5L9 9H5z" />
                  <path d="M16.5 12c0-1.77-.77-3.36-2-4.47v8.94c1.23-1.11 2-2.7 2-4.47z" />
                </svg>
              )}
            </button>
            <button onClick={handleToggleFav} className={`px-3 py-1 rounded ${isFavorite ? 'bg-yellow-400 text-black' : 'glass'}`} aria-label={isFavorite ? 'Unfavorite' : 'Favorite'} title={isFavorite ? 'Unfavorite' : 'Favorite'} aria-pressed={isFavorite}>
              {isFavorite ? (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
