import React, { useState, useEffect, useRef } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
import StationCard from './StationCard';

function FavoritesCarousel({ favorites, onSelectStation, toggleFavorite }) {
  const [start, setStart] = useState(0);
  const perPage = 5;
  const end = start + perPage;
  const canPrev = start > 0;
  const canNext = end < favorites.length;
  const scrollRef = useRef(null);

  useEffect(() => { setStart(0); }, [favorites.length]);

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold">Favorite Radios</h2>
        <div>
          <button onClick={() => setStart(Math.max(0, start - perPage))} disabled={!canPrev} className="px-2 py-1 mx-1 rounded bg-gray-200 dark:bg-gray-700 disabled:opacity-50">&#8592;</button>
          <button onClick={() => setStart(Math.min(favorites.length - perPage, start + perPage))} disabled={!canNext} className="px-2 py-1 mx-1 rounded bg-gray-200 dark:bg-gray-700 disabled:opacity-50">&#8594;</button>
        </div>
      </div>
      <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-700 dark:scrollbar-track-gray-900">
        {favorites.slice(start, end).map(station => (
          <StationCard
            key={station.stationuuid}
            station={station}
            onPlay={() => onSelectStation(station)}
            isFav={true}
            onToggleFav={() => toggleFavorite(station)}
          />
        ))}
      </div>
    </div>
  );
}


export default function TopCarousel({ favorites, onSelectStation, toggleFavorite, component }) {
  const [section, setSection] = useState(favorites.length > 0 ? 'favorites' : 'discover');

  useEffect(() => {
    if (favorites.length > 0) setSection('favorites');
    else setSection('discover');
  }, [favorites.length]);

  const Component = component;

  const handleSectionChange = (nextSection) => {
    if (nextSection === section) return;
    setSection(nextSection);
  };

  return (
    <div className="mb-8 w-full max-w-full">
      <div className="flex items-center gap-4 mb-4">
        <button
          className={`px-4 py-2 rounded font-semibold transition-colors flex items-center gap-2 ${section === 'favorites' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
          onClick={() => handleSectionChange('favorites')}
          disabled={favorites.length === 0}
        >
          <span>Favorites</span>
          <span className="inline-block min-w-[1.5em] px-2 py-0.5 rounded-full bg-white/80 dark:bg-black/40 text-blue-600 dark:text-blue-300 text-xs font-bold align-middle border border-blue-200 dark:border-blue-700 ml-1">{favorites.length}</span>
        </button>
        <button
          className={`px-4 py-2 rounded font-semibold transition-colors ${section === 'discover' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
          onClick={() => handleSectionChange('discover')}
        >
          Discover
        </button>
      </div>
      <div className="min-h-[220px] w-full max-w-full overflow-x-hidden">
        {section === 'favorites' && favorites.length > 0 && (
          <div className="w-full">
            <FavoritesCarousel favorites={favorites} onSelectStation={onSelectStation} toggleFavorite={toggleFavorite} />
          </div>
        )}
        {section === 'discover' && (
          <div className="w-full overflow-x-auto">
            <Component onSelectStation={onSelectStation} favorites={favorites} toggleFavorite={toggleFavorite} />
          </div>
        )}
      </div>
    </div>
  );
}
