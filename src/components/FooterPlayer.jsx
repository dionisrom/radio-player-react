import React, { useEffect, useState, useRef } from 'react'

export default function FooterPlayer({ station, isFavorite, playerControls = null, toggleFavorite, playerPlaying = null, nowPlaying = '', longPressMs = 450, streamError = '', clearStreamError = null }) {
  const [volume, setVolumeState] = useState(0.8);
  const [muted, setMutedState] = useState(false);
  const [playing, setPlayingState] = useState(false);
  const [showVolumePopover, setShowVolumePopover] = useState(false);
  const [longPressActive, setLongPressActive] = useState(false);
  const playingTimer = useRef(null);
  const [pulse, setPulse] = useState(false);
  const pulseTimer = useRef(null);
  const popoverRef = useRef(null);
  const volumeButtonRef = useRef(null);
  const longPressTimer = useRef(null);
  const longPressTriggered = useRef(false);
  const LONG_PRESS_MS = typeof longPressMs === 'number' ? longPressMs : 450;

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

  // Close popover on outside click or Escape
  useEffect(() => {
    if (!showVolumePopover) return;
    function onDocClick(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target) && volumeButtonRef.current && !volumeButtonRef.current.contains(e.target)) {
        setShowVolumePopover(false);
      }
    }
    function onEsc(e) {
      if (e.key === 'Escape') setShowVolumePopover(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('touchstart', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('touchstart', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [showVolumePopover]);

  useEffect(() => {
    return () => {
      if (pulseTimer.current) clearTimeout(pulseTimer.current);
      if (playingTimer.current) clearTimeout(playingTimer.current);
    };
  }, []);

  // FooterPlayer no longer manages metadata subscription; App owns nowPlaying and passes it here.

  const handlePlay = async () => {
    // iOS/Safari fix: resume AudioContext on user gesture
    if (playerControls && typeof playerControls.getAudioContext === 'function') {
      const ctx = playerControls.getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        try { await ctx.resume(); } catch (e) { /* ignore */ }
      }
    }
    if (playerControls && playerControls.play) await playerControls.play();
  }
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
        // iOS/Safari fix: resume AudioContext on user gesture
        if (typeof playerControls.getAudioContext === 'function') {
          const ctx = playerControls.getAudioContext();
          if (ctx && ctx.state === 'suspended') {
            try { await ctx.resume(); } catch (e) { /* ignore */ }
          }
        }
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
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-12 h-12 bg-linear-to-br from-blue-400 to-indigo-600 rounded-md flex items-center justify-center text-white font-bold text-sm transform transition-all duration-300 ${pulse ? 'scale-105 ring-4 ring-blue-400/40 shadow-lg' : ''}`}>FM</div>
          <div className="truncate min-w-0">
            <div className="font-medium text-sm truncate">{station ? station.name : 'No station selected'}</div>
              {nowPlaying ? (
                <div className="text-xs truncate text-gray-900 dark:text-gray-200">{nowPlaying}</div>
              ) : (
                <div className="text-xs truncate text-gray-500 dark:text-gray-400">{station ? `${station.country} • ${station.codec} • ${station.bitrate} kbps` : 'Select a station to play'}</div>
              )}
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={handleTogglePlay} className="p-2 sm:px-3 sm:py-1 rounded-sm btn-theme" aria-label={playing ? 'Pause' : 'Play'} title={playing ? 'Pause' : 'Play'} aria-pressed={playing}>
              {playing ? (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <button onClick={handleStop} className="p-2 sm:px-3 sm:py-1 rounded-sm bg-red-600 text-white" aria-label="Stop" title="Stop">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M6 6h12v12H6z" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-3">
            {/* Combined button: short tap toggles mute, long-press opens volume popover (mobile) */}
            <button
              ref={volumeButtonRef}
              onPointerDown={(e) => {
                // start long-press detection and visual indicator
                longPressTriggered.current = false;
                setLongPressActive(true);
                if (longPressTimer.current) clearTimeout(longPressTimer.current);
                longPressTimer.current = setTimeout(() => {
                  longPressTriggered.current = true;
                  setShowVolumePopover(true);
                  // short haptic feedback when long-press activates (if available)
                  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                }, LONG_PRESS_MS);
              }}
              onPointerUp={(e) => {
                // short tap (if long-press didn't trigger) toggles mute
                if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
                // stop visual indicator
                setLongPressActive(false);
                if (longPressTriggered.current) {
                  // long press already handled (opened popover), reset flag
                  longPressTriggered.current = false;
                  return;
                }
                handleSetMuted(!muted);
              }}
              onPointerCancel={() => {
                if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
                longPressTriggered.current = false;
                setLongPressActive(false);
              }}
              onPointerLeave={() => {
                // cancel if pointer moves away
                if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
                setLongPressActive(false);
              }}
              className="p-2 rounded-sm btn-theme shrink-0"
              aria-label={muted ? 'Unmute' : 'Mute / Hold for volume'}
              title={muted ? 'Unmute' : 'Mute / Hold for volume'}
              aria-pressed={muted}
            >
              {muted ? (
                // speaker with an X overlay
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M5 9v6h4l5 4V5L9 9H5z" fill="currentColor" />
                  <path d="M18 8l4 4M22 8l-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                // simple speaker icon
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M5 9v6h4l5 4V5L9 9H5z" />
                  <path d="M16.5 12c0-1.77-.77-3.36-2-4.47v8.94c1.23-1.11 2-2.7 2-4.47z" />
                </svg>
              )}
              {/* visual long-press progress indicator (fills from bottom to top) */}
              <span aria-hidden className="absolute inset-0 flex items-end justify-center pointer-events-none">
                <span
                  className="bg-white/25 dark:bg-white/10 rounded-full w-10"
                  style={{
                    height: longPressActive ? '100%' : '0%',
                    transition: `height ${LONG_PRESS_MS}ms linear`,
                    transformOrigin: 'bottom'
                  }}
                />
              </span>
            </button>
            {/* Desktop: inline horizontal slider; Mobile: popover trigger */}
            <div className="hidden sm:flex items-center">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={e => handleSetVolume(Number(e.target.value))}
                aria-label="Adjust volume"
                title="Adjust volume"
                className="w-36 lg:w-40 accent-blue-500"
              />
            </div>

            {/* Mobile popover is handled by the same combined button; popover markup (positioned relative to the button) */}
            <div className="sm:hidden relative">
              {showVolumePopover && (
                <div id="volume-popover" ref={popoverRef} role="dialog" aria-label="Volume" className="absolute bottom-12 right-0 z-50 p-1 bg-white/90 dark:bg-gray-800/90 rounded-md shadow-lg backdrop-blur-md border border-white/20 w-14">
                  {/* small diamond arrow pointing to the trigger */}
                  <div className="absolute -top-2 right-3 w-3 h-3 transform rotate-45 bg-white/90 dark:bg-gray-800/90 border border-white/20" aria-hidden />
                  <div className="flex items-center justify-center py-1">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={e => handleSetVolume(Number(e.target.value))}
                      aria-label="Adjust volume"
                      title="Adjust volume"
                      className="accent-blue-500"
                      style={{
                        WebkitAppearance: 'slider-vertical',
                        width: '8px',
                        height: '110px',
                        writingMode: 'bt-lr',
                        display: 'block',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <button onClick={handleToggleFav} className={`p-2 sm:px-3 sm:py-1 rounded-sm ${isFavorite ? 'bg-yellow-400 text-black' : 'glass'}`} aria-label={isFavorite ? 'Unfavorite' : 'Favorite'} title={isFavorite ? 'Unfavorite' : 'Favorite'} aria-pressed={isFavorite}>
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
