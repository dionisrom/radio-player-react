import React from 'react'
import { SunIcon, MoonIcon } from './ThemeIcons'

export default function Header({ theme, setTheme, visBg, setVisBg, nowPlaying = '' }) {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-2 rounded-2xl mb-6 shadow-xl glass backdrop-blur-lg bg-white/30 dark:bg-black/30 border border-white/20 dark:border-black/20">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full glass w-12 h-12 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M4 10a8 8 0 0116 0v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div>
          <h1 className="text-xl font-semibold">RadioStream</h1>
          {nowPlaying ? (
            <p className="text-xs text-gray-200">Now playing: {nowPlaying}</p>
          ) : (
            <p className="text-xs text-gray-400">Discover & play online radio stations</p>
          )}
        </div>
      </div>
      <div className="flex flex-row gap-3 items-center">
        <button
          aria-label="Toggle dark mode"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-colors shadow-lg glass border border-white/20 dark:border-black/20 ${theme === 'dark' ? 'bg-black/70' : 'bg-white/80'}`}
          style={{ minWidth: 48 }}
        >
          <span className="absolute inset-0 flex items-center justify-center transition-opacity duration-300">
            <SunIcon className={`w-7 h-7 text-yellow-400 ${theme === 'dark' ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`} />
            <MoonIcon className={`w-7 h-7 text-blue-300 absolute ${theme === 'dark' ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`} />
          </span>
        </button>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className="font-medium text-sm">
            {visBg ? 'Visualization as background on' : 'Visualization as background off'}
          </span>
          <input
            type="checkbox"
            checked={!!visBg}
            onChange={e => setVisBg(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-cyan-400 transition-all duration-200 relative">
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white dark:bg-gray-300 shadow-md transition-transform duration-200 ${visBg ? 'translate-x-5' : ''}`}></div>
          </div>
        </label>
      </div>
    </header>
  )
}
