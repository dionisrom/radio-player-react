
import React, { useEffect, useState } from 'react'
import Header from './components/Header'
import StationList from './components/StationList'
import Player from './components/Player'
import TopCarousel from './components/TopCarousel'
import Discover from './components/Discover'
import Visualization from './components/Visualization'


// ...existing code...

export default function App() {
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
  const [visBg, setVisBg] = useState(false) // visualization as background toggle
  const [analyserRef, setAnalyserRef] = useState(null)
  const [audioCtx, setAudioCtx] = useState(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    saveLocal('theme', theme)
  }, [theme])

  useEffect(() => saveLocal('favorites', favorites), [favorites])

  const toggleFavorite = (station) => {
    const exists = favorites.find((s) => s.stationuuid === station.stationuuid)
    if (exists) {
      setFavorites(favorites.filter((s) => s.stationuuid !== station.stationuuid))
    } else {
      setFavorites([station, ...favorites])
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-8 transition-colors relative">

  {/* Header now contains the toggles, so remove fixed top-right toggles */}


      {/* Visualization: only one instance, correct parent for each mode */}
      {visBg && (
        <Visualization analyser={analyserRef} audioCtx={audioCtx} visBg={visBg} setVisBg={setVisBg} />
      )}

      <div className="w-full max-w-none mx-auto relative z-10">
  <Header theme={theme} setTheme={setTheme} visBg={visBg} setVisBg={setVisBg} />
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr,420px] gap-6">
          <main
            className={`space-y-4 rounded-2xl p-2 md:p-4 transition-all ${visBg ? 'backdrop-blur-lg bg-white/30 dark:bg-black/30 border border-white/20 dark:border-black/20 shadow-xl' : ''}`}
          >
            <TopCarousel
              favorites={favorites}
              onSelectStation={setSelected}
              toggleFavorite={toggleFavorite}
              component={Discover}
            />
            <StationList
              onSelectStation={setSelected}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              showOnlyFavorites={showOnlyFavorites}
              setShowOnlyFavorites={setShowOnlyFavorites}
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
              favorites={favorites}
            />
            {!visBg && (
              <Visualization analyser={analyserRef} audioCtx={audioCtx} visBg={visBg} setVisBg={setVisBg} />
            )}

          </aside>
        </div>
      </div>
    </div>
  )
}
