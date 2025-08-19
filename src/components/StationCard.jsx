import React from 'react'

export default function StationCard({ station, onPlay, isFav, onToggleFav, nowPlaying = '' }) {
  return (
  <div className="p-4 rounded-lg shadow-lg bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-white/20 dark:border-black/20">
      <img
        src={station.favicon || '/default-radio-icon.png'}
        alt={station.name}
        className="w-full h-24 object-contain mb-2"
        onError={(e) => { e.target.onerror = null; e.target.src = '/default-radio-icon.png'; }}
      />
      <h3 className="text-lg font-bold truncate" title={station.name}>{station.name}</h3>
      <p className="text-sm text-gray-500 truncate" title={`${station.country} • ${station.codec} • ${station.bitrate} kbps`}>
        {station.country} • {station.codec} • {station.bitrate} kbps
      </p>
      {nowPlaying && nowPlaying.toLowerCase().includes((station.name || '').toLowerCase()) && (
        <p className="text-xs text-gray-400 truncate mt-1">Now playing on this station: {nowPlaying}</p>
      )}
      <div className="mt-2 flex items-center gap-2">
        <button onClick={onPlay} className="px-3 py-1 rounded bg-blue-500 text-white">Play</button>
        <button onClick={onToggleFav} className={`px-3 py-1 rounded ${isFav ? 'bg-yellow-400 text-black' : 'bg-gray-200 dark:bg-gray-700'}`}>
          {isFav ? '★' : '☆'}
        </button>
      </div>
    </div>
  );
}
