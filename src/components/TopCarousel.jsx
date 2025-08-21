// Enable drag-to-scroll for carousels on desktop
function useDragScroll(ref) {
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let isDown = false;
    let startX;
    let scrollLeft;
    const onPointerDown = (e) => {
      if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
        isDown = true;
        el.classList.add('dragging');
        startX = e.pageX - el.offsetLeft;
        scrollLeft = el.scrollLeft;
        el.setPointerCapture(e.pointerId);
      }
    };
    const onPointerMove = (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = x - startX;
      el.scrollLeft = scrollLeft - walk;
    };
    const onPointerUp = (e) => {
      isDown = false;
      el.classList.remove('dragging');
      el.releasePointerCapture(e.pointerId);
    };
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointerleave', onPointerUp);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointerleave', onPointerUp);
    };
  }, [ref]);
}
import React, { useState, useEffect, useRef } from 'react';
import { fetchTopVoted } from '../utils/radiobrowser';
import StationCardCarousel from './StationCardCarousel';

function FavoritesCarousel({ favorites, onSelectStation, toggleFavorite }) {
  // Remove paging logic for free scroll
  const containerRef = useRef(null);
  useDragScroll(containerRef);

  // No paging logic needed for free scroll

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold">Favorite Radios</h2>
      </div>
  <div ref={containerRef} className="flex gap-4 overflow-x-auto hide-scrollbar overflow-y-hidden pb-2 cursor-grab">
        {favorites.map(station => (
          <StationCardCarousel
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


function TopCarousel({ favorites, onSelectStation, toggleFavorite, component }) {
  const [section, setSection] = useState(favorites.length > 0 ? 'favorites' : 'discover');

  useEffect(() => {
    if (favorites.length > 0) setSection('favorites');
    else setSection('discover');
  }, [favorites.length]);

  const Component = component;

  // Discover carousel: mirrors FavoritesCarousel but fetches trending stations
  function DiscoverCarousel({ onSelectStation, favorites, toggleFavorite }) {
  // Remove paging logic for free scroll
  const containerRef = useRef(null);
  useDragScroll(containerRef);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);

    useEffect(() => {
      let isMounted = true;
      setLoading(true);
      (async () => {
        try {
          const results = await fetchTopVoted({ perPage: 12 });
          if (isMounted) setStations(results || []);
        } catch (err) {
          console.error('Failed to fetch discover stations', err);
          if (isMounted) setStations([]);
        } finally {
          if (isMounted) setLoading(false);
        }
      })();
      return () => { isMounted = false };
    }, []);

  // No paging logic needed for free scroll

  // No paging logic needed for free scroll

    return (
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold">Discover</h2>
        </div>
  <div ref={containerRef} className="flex gap-4 overflow-x-auto hide-scrollbar overflow-y-hidden pb-2 cursor-grab">
          {loading ? (
            <div className="text-gray-500">Loading...</div>
          ) : (
            stations.map(station => (
              <StationCardCarousel
                key={station.stationuuid}
                station={station}
                onPlay={() => onSelectStation(station)}
                isFav={!!favorites.find(f => f.stationuuid === station.stationuuid)}
                onToggleFav={() => toggleFavorite(station)}
              />
            ))
          )}
        </div>
      </div>
    );
  }

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
          <div className="w-full">
            <DiscoverCarousel onSelectStation={onSelectStation} favorites={favorites} toggleFavorite={toggleFavorite} />
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(TopCarousel);
