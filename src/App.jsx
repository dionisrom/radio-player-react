
import React, { useEffect, useState, useRef, useCallback } from 'react'
import Header from './components/Header'
import Modal from './components/Modal'
import EQ from './components/EQ'
import Select from 'react-select';
import ErrorModal from './components/ErrorModal'
import StationList from './components/StationList'
import Player from './components/Player'
import TopCarousel from './components/TopCarousel'
import Visualization from './components/Visualization'
import FooterPlayer from './components/FooterPlayer'


// ...existing code...

export default function App() {
  const [showEQ, setShowEQ] = useState(false);
  const [eqProps, setEQProps] = useState(null);
  function loadLocal(key, fallback) {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : fallback
    } catch {
      return fallback
    }
  }
  function saveLocal(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {}
  }

  const [theme, setTheme] = useState(loadLocal('theme', 'dark'))
  const [selected, setSelected] = useState(null)
  const [favorites, setFavorites] = useState(loadLocal('favorites', []))
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false)
  const [visBg, setVisBg] = useState(loadLocal('visBg', true)) // visualization as background toggle (default ON)
  const [analyserRef, setAnalyserRef] = useState(null)
  const [audioCtx, setAudioCtx] = useState(null)
  const [recentlyPlayed, setRecentlyPlayed] = useState(loadLocal('recentlyPlayed', []));
  const [playerControls, setPlayerControls] = useState(null);
  const [playerPlaying, setPlayerPlaying] = useState(false);
  const [nowPlaying, setNowPlaying] = useState('');
  const [streamError, setStreamError] = useState('');
  const [errorModalMode, setErrorModalMode] = useState(loadLocal('errorModalMode', 'auto'));
  useEffect(() => saveLocal('errorModalMode', errorModalMode), [errorModalMode]);
  const registerControls = React.useCallback((controls) => {
    setPlayerControls(prev => prev === controls ? prev : controls);
  }, []);

  // Refs to hold latest mutable values so we can use stable callbacks
  const playerControlsRef = useRef(playerControls);
  useEffect(() => { playerControlsRef.current = playerControls; }, [playerControls]);
  const selectedRef = useRef(selected);
  useEffect(() => { selectedRef.current = selected; }, [selected]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    saveLocal('theme', theme)
  }, [theme])

  useEffect(() => saveLocal('favorites', favorites), [favorites])

  useEffect(() => saveLocal('visBg', visBg), [visBg])

  const toggleFavorite = useCallback((station) => {
    setFavorites(prev => {
      const exists = prev.find((s) => s.stationuuid === station.stationuuid);
      if (exists) return prev.filter((s) => s.stationuuid !== station.stationuuid);
      return [station, ...prev];
    });
  }, []);

  // Add to recently played when a new station is selected
  useEffect(() => {
    if (selected && selected.stationuuid) {
      setRecentlyPlayed(prev => {
        const filtered = prev.filter(s => s.stationuuid !== selected.stationuuid);
        const next = [selected, ...filtered].slice(0, 10);
        saveLocal('recentlyPlayed', next);
        return next;
      });
    }
  }, [selected]);

  // Select a station: fully stop/clear existing player first to avoid re-init/restart races
  const handleSelectStation = useCallback((station) => {
    if (!station) {
      setSelected(null);
      return;
    }
    // If same station, do nothing
    if (selectedRef.current && station.stationuuid === selectedRef.current.stationuuid) return;

    // Stop existing player via ref (avoid depending on playerControls identity)
    try {
      const ctrl = playerControlsRef.current;
      if (ctrl && typeof ctrl.stop === 'function') ctrl.stop();
    } catch (e) {
      console.warn('Error stopping existing player before selecting new station', e);
    }

    // Clear UI metadata and set new station immediately; Player does cleanup
    try { setNowPlaying(''); } catch (e) {}
    setSelected(station);
  }, []);

  // Export favorites as JSON file
  function exportFavorites() {
    const dataStr = JSON.stringify(favorites, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'radio-favorites.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  // Import favorites from JSON file
  function importFavorites(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target.result);
        if (Array.isArray(imported) && imported.every(s => s.stationuuid)) {
          setFavorites(imported);
        } else {
          alert('Invalid favorites file.');
        }
      } catch {
        alert('Could not parse favorites file.');
      }
    };
    reader.readAsText(file);
    // Reset input value so same file can be re-imported
    e.target.value = '';
  }

  return (
    <div className="min-h-screen p-4 md:p-8 transition-colors relative">

      {/* Error Modal Overlay (fixed, not in layout flow) */}
      <ErrorModal
        message={streamError}
        onDismiss={() => setStreamError('')}
        autoHide={errorModalMode === 'auto'}
        duration={5000}
      />

  {/* Header now contains the toggles, so remove fixed top-right toggles */}


      {/* Visualization: only one instance, correct parent for each mode */}
      {visBg && (
        <Visualization analyser={analyserRef} audioCtx={audioCtx} visBg={visBg} setVisBg={setVisBg} />
      )}

      <div className="w-full max-w-none mx-auto relative z-10">
  <Header
    theme={theme}
    setTheme={setTheme}
    visBg={visBg}
    setVisBg={setVisBg}
    nowPlaying={nowPlaying}
    exportFavorites={exportFavorites}
    importFavorites={importFavorites}
    errorModalMode={errorModalMode}
    setErrorModalMode={setErrorModalMode}
    eqProps={eqProps}
    setShowEQ={setShowEQ}
  />
      {/* EQ Modal rendered at root level */}
      <Modal open={showEQ} onClose={() => setShowEQ(false)} title="Equalizer">
        {eqProps && (
          <>
            <div className="mb-4">
              <div className="flex flex-row items-center gap-2 flex-wrap">
                <label className="text-sm font-medium whitespace-nowrap mr-1 block mb-1">EQ Preset</label>
                <div className="min-w-[140px] flex-1">
                  <Select
                    value={{ value: eqProps.selectedPreset, label: eqProps.selectedPreset }}
                    onChange={opt => eqProps.applyPreset(opt ? opt.value : 'Flat')}
                    options={Object.keys(eqProps.presets).map(k => ({ value: k, label: k }))}
                    styles={eqProps.selectStyles ? eqProps.selectStyles(eqProps.theme) : {}}
                    isSearchable={false}
                    menuPlacement="auto"
                    closeMenuOnSelect={true}
                    className="react-select-container"
                    classNamePrefix="select"
                    menuPortalTarget={typeof window !== 'undefined' ? window.document.body : undefined}
                  />
                </div>
                <button
                  onClick={() => eqProps.applyPreset('Flat')}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold shadow-sm hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-blue-400 transition"
                  title="Reset EQ to Flat"
                >
                  Reset
                </button>
                <button
                  onClick={eqProps.saveCustomPreset}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold shadow-sm hover:bg-green-700 focus:outline-hidden focus:ring-2 focus:ring-green-400 transition"
                  title="Save as Custom Preset"
                >
                  Save
                </button>
              </div>
            </div>
            <EQ freqs={eqProps.freqs} gains={eqProps.gains} setBandGain={eqProps.setBandGain} />
          </>
        )}
      </Modal>
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
          <main
            className={`space-y-4 rounded-2xl p-2 md:p-16 pb-16 transition-all min-w-0 ${visBg ? 'backdrop-blur-lg bg-white/30 dark:bg-black/30 border border-white/20 dark:border-black/20 shadow-xl' : ''}`}
          >
            <TopCarousel
              favorites={favorites}
              onSelectStation={handleSelectStation}
              toggleFavorite={toggleFavorite}
            />
            <StationList
              onSelectStation={handleSelectStation}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              showOnlyFavorites={showOnlyFavorites}
              setShowOnlyFavorites={setShowOnlyFavorites}
              nowPlaying={nowPlaying}
              theme={theme}
            />
          </main>

          <aside
            className={`glass p-4 rounded-2xl transition-all ${visBg ? 'backdrop-blur-lg bg-white/30 dark:bg-black/30 border border-white/20 dark:border-black/20 shadow-xl' : ''}`}
          >
            <Player
              station={selected}
              onClose={() => setSelected(null)}
              toggleFavorite={toggleFavorite}
              isFavorite={!!(selected && favorites.find(s => s.stationuuid === selected.stationuuid))}
              setVisBg={setVisBg}
              setAnalyserRef={setAnalyserRef}
              setAudioCtxFromApp={setAudioCtx}
              recentlyPlayed={recentlyPlayed}
              registerControls={registerControls}
              setPlayingOnApp={setPlayerPlaying}
              setNowPlaying={setNowPlaying}
              onStreamError={setStreamError}
              theme={theme}
              registerEQProps={setEQProps}
            />
            {!visBg && (
              <Visualization analyser={analyserRef} audioCtx={audioCtx} visBg={visBg} setVisBg={setVisBg} />
            )}

          </aside>
        </div>

        {/* Persistent footer player (always rendered) */}
        <FooterPlayer
          station={selected}
          isFavorite={!!(selected && favorites.find(s => s.stationuuid === selected.stationuuid))}
          playerControls={playerControls}
          playerPlaying={playerPlaying}
          toggleFavorite={toggleFavorite}
          nowPlaying={nowPlaying}
          streamError={streamError}
          clearStreamError={() => setStreamError('')}
          onStop={() => {
            setSelected(null);
            setNowPlaying('');
          }}
        />
      </div>
    </div>
  )
}
