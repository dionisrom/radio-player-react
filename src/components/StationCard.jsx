import React from 'react'
import defaultIcon from '../../default-radio-icon.png'

function StationCard({ station, onPlay, isFav, onToggleFav, nowPlaying = '' }) {
  const isDark = (typeof window !== 'undefined' && document.documentElement.classList.contains('dark'));
  return (
    <div className="flex flex-col h-full min-h-[220px] p-4 rounded-lg shadow-lg bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-white/20 dark:border-black/20 hover:shadow-2xl transition-shadow duration-200">
      <div className="flex-shrink-0 mb-3">
        <div className="w-full h-28 bg-white/10 dark:bg-black/10 rounded-md flex items-center justify-center overflow-hidden" style={{ minHeight: '5.5rem' }}>
          <img
            src={station.favicon}
            alt={station.name}
            className="max-h-full max-w-full object-contain"
            onError={(e) => { e.target.onerror = null; e.target.src = defaultIcon; }}
          />
        </div>
      </div>

      <div className="flex-1">
        <h3 className="text-sm font-semibold leading-tight mb-1" title={station.name} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{station.name}</h3>
        <p className="text-xs text-gray-500 mb-2 truncate" title={`${station.country} • ${station.codec} • ${station.bitrate} kbps`}>
          {station.country} • {station.codec} • {station.bitrate} kbps
        </p>

        {nowPlaying && nowPlaying.toLowerCase().includes((station.name || '').toLowerCase()) && (
          <div className="inline-block mb-2 px-2 py-1 text-xs rounded-full text-white/90 bg-blue-600 dark:bg-blue-500">
            <span className="text-sm font-semibold text-white dark:text-white">Now playing</span>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={onPlay}
          aria-label={`Play ${station.name}`}
          title={`Play ${station.name}`}
          className="p-2 rounded-md flex items-center justify-center transition-colors duration-150 btn-theme"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
          <span className="sr-only">Play {station.name}</span>
        </button>

        <button onClick={onToggleFav} aria-label={isFav ? 'Unfavorite' : 'Favorite'} title={isFav ? 'Unfavorite' : 'Favorite'} className={`p-2 rounded-md flex items-center justify-center ${isFav ? 'bg-yellow-400 text-black' : 'glass'}`} aria-pressed={!!isFav}>
          {isFav ? (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

export default React.memo(StationCard);
