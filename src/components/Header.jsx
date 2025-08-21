import React from 'react'
import MoreMenu from './MoreMenu'

export default function Header({ theme, setTheme, visBg, setVisBg, nowPlaying = '', exportFavorites, importFavorites, errorModalMode, setErrorModalMode }) {
  return (
    <header className="sticky top-0 z-50 flex flex-col gap-2 px-4 py-2 rounded-2xl mb-6 shadow-xl glass backdrop-blur-lg bg-white/30 dark:bg-black/30 border border-white/20 dark:border-black/20">
  {/* Error message is now handled by ErrorModal overlay */}
      <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full glass w-12 h-12 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M4 10a8 8 0 0116 0v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div>
          <h1 className="text-xl font-semibold">RadioStream</h1>
          {nowPlaying ? (
            <p className="text-sm text-gray-900 dark:text-gray-200 truncate">Now playing: {nowPlaying}</p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">Discover & play online radio stations</p>
          )}
        </div>
      </div>
      <div className="flex flex-row gap-3 items-center">
        {/* More menu: contains visualization toggle, import/export, error modal config, and other secondary actions */}
        <MoreMenu
          visBg={visBg}
          setVisBg={setVisBg}
          theme={theme}
          setTheme={setTheme}
          exportFavorites={exportFavorites}
          importFavorites={importFavorites}
          errorModalMode={errorModalMode}
          setErrorModalMode={setErrorModalMode}
        />
      </div>
  </div>
    </header>
  )
}
