import React, { useRef, useState } from 'react'
import { DotsVerticalIcon, ChevronDownIcon, DownloadIcon, UploadIcon } from './Icons'

export default function MoreMenu({ visBg, setVisBg, theme, setTheme, exportFavorites, importFavorites }) {
  const [open, setOpen] = useState(false)
  const fileInputRef = useRef(null)

  function onImportClick() {
    fileInputRef.current && fileInputRef.current.click()
  }

  return (
    <div className="relative">
      <button
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className="w-12 h-12 rounded-full flex items-center justify-center glass border border-white/20 dark:border-black/20 shadow-lg"
        title="More"
      >
        <DotsVerticalIcon className="w-6 h-6 text-gray-300" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white/70 dark:bg-black/70 glass backdrop-blur-md rounded-lg p-3 shadow-lg border border-white/10 z-50">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-sm">Settings</span>
            <button className="text-xs text-gray-400" onClick={() => setOpen(false)}>Close</button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Theme</div>
                <div className="text-xs text-gray-400">Switch light/dark</div>
              </div>
              <button
                aria-label="Toggle dark mode"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-800 text-sm"
              >
                {theme === 'dark' ? 'Dark' : 'Light'}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Visualization</div>
                <div className="text-xs text-gray-400">Use visualization as background</div>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only" checked={!!visBg} onChange={e => setVisBg(e.target.checked)} />
                <div className={`w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full transition-all relative ${visBg ? 'ring-2 ring-cyan-400' : ''}`}>
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white dark:bg-gray-300 shadow-md transition-transform ${visBg ? 'translate-x-5' : ''}`}></div>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Export Favorites</div>
                <div className="text-xs text-gray-400">Download your favorites as JSON</div>
              </div>
              <button onClick={() => { exportFavorites && exportFavorites(); setOpen(false) }} className="px-3 py-1 rounded bg-blue-600 text-white text-sm">Export</button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Import Favorites</div>
                <div className="text-xs text-gray-400">Upload a JSON file</div>
              </div>
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" accept="application/json" onChange={(e) => { importFavorites && importFavorites(e); setOpen(false) }} style={{ display: 'none' }} />
                <button onClick={onImportClick} className="px-3 py-1 rounded bg-green-600 text-white text-sm">Import</button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
