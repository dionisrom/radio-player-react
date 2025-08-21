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
// Arrow SVG
const Arrow = ({ direction = 'left', ...props }) => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" {...props}>
    <circle cx="16" cy="16" r="16" fill="rgba(30,30,40,0.35)" />
    <path d={direction === 'left' ? 'M19 24l-8-8 8-8' : 'M13 8l8 8-8 8'} stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
import { fetchTopVoted } from '../utils/radiobrowser';
import { isMobile } from '../utils/deviceDetection';
import StationCardCarousel from './StationCardCarousel';

function FavoritesCarousel({ favorites, onSelectStation, toggleFavorite }) {
  const containerRef = useRef(null);
  // Only enable drag-to-scroll on mobile
  useEffect(() => {
    if (isMobile()) {
      useDragScroll(containerRef);
    }
    // eslint-disable-next-line
  }, []);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  // Check scroll position to show/hide arrows
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      setShowLeft(el.scrollLeft > 5);
      setShowRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 5);
    };
    update();
    el.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [favorites.length]);

  // On PC, scroll by a moderate amount for a more page-like effect
  const scrollBy = (amount) => {
    const el = containerRef.current;
    if (!el) return;
    let scrollAmount = amount;
    if (!isMobile()) {
      scrollAmount = amount > 0 ? el.clientWidth * 0.4 : -el.clientWidth * 0.4;
    }
    el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold">Favorite Radios</h2>
      </div>
      <div className="relative flex items-stretch">
        {/* Left Arrow Glass Container */}
        {showLeft && (
          <div className="absolute left-0 top-0 bottom-0 flex items-center z-20" style={{height: '100%', width: 48, margin: 0, padding: 0}}>
            <div className="glass flex items-center justify-center h-full w-full rounded-l-lg" style={{background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(8px) saturate(120%)'}}>
              <button
                className="p-1 rounded-full focus:outline-hidden"
                style={{ pointerEvents: 'auto' }}
                onClick={() => scrollBy(-220)}
                aria-label="Scroll left"
              >
                <Arrow direction="left" />
              </button>
            </div>
          </div>
        )}
        {/* Right Arrow Glass Container */}
        {showRight && (
          <div className="absolute right-0 top-0 bottom-0 flex items-center z-20" style={{height: '100%', width: 48, margin: 0, padding: 0}}>
            <div className="glass flex items-center justify-center h-full w-full rounded-r-lg" style={{background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(8px) saturate(120%)'}}>
              <button
                className="p-1 rounded-full focus:outline-hidden"
                style={{ pointerEvents: 'auto' }}
                onClick={() => scrollBy(220)}
                aria-label="Scroll right"
              >
                <Arrow direction="right" />
              </button>
            </div>
          </div>
        )}
        <div
          ref={containerRef}
          className="flex gap-4 overflow-x-auto hide-scrollbar overflow-y-hidden pb-2 cursor-grab w-full"
          style={{ scrollBehavior: 'smooth' }}
        >
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
    const containerRef = useRef(null);
    // Only enable drag-to-scroll on mobile
    useEffect(() => {
      if (isMobile()) {
        useDragScroll(containerRef);
      }
      // eslint-disable-next-line
    }, []);
    const [stations, setStations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showLeft, setShowLeft] = useState(false);
    const [showRight, setShowRight] = useState(false);

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

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const update = () => {
        setShowLeft(el.scrollLeft > 5);
        setShowRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 5);
      };
      update();
      el.addEventListener('scroll', update);
      window.addEventListener('resize', update);
      return () => {
        el.removeEventListener('scroll', update);
        window.removeEventListener('resize', update);
      };
    }, [stations.length]);

    // On PC, scroll by a moderate amount for a more page-like effect
    const scrollBy = (amount) => {
      const el = containerRef.current;
      if (!el) return;
      let scrollAmount = amount;
      if (!isMobile()) {
        scrollAmount = amount > 0 ? el.clientWidth * 0.4 : -el.clientWidth * 0.4;
      }
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    };

    return (
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold">Discover</h2>
        </div>
        <div className="relative flex items-stretch">
          {/* Left Arrow Glass Container */}
          {showLeft && (
            <div className="absolute left-0 top-0 bottom-0 flex items-center z-20" style={{height: '100%', width: 48, margin: 0, padding: 0}}>
              <div className="glass flex items-center justify-center h-full w-full rounded-l-lg" style={{background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(8px) saturate(120%)'}}>
                <button
                  className="p-1 rounded-full focus:outline-hidden"
                  style={{ pointerEvents: 'auto' }}
                  onClick={() => scrollBy(-220)}
                  aria-label="Scroll left"
                >
                  <Arrow direction="left" />
                </button>
              </div>
            </div>
          )}
          {/* Right Arrow Glass Container */}
          {showRight && (
            <div className="absolute right-0 top-0 bottom-0 flex items-center z-20" style={{height: '100%', width: 48, margin: 0, padding: 0}}>
              <div className="glass flex items-center justify-center h-full w-full rounded-r-lg" style={{background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(8px) saturate(120%)'}}>
                <button
                  className="p-1 rounded-full focus:outline-hidden"
                  style={{ pointerEvents: 'auto' }}
                  onClick={() => scrollBy(220)}
                  aria-label="Scroll right"
                >
                  <Arrow direction="right" />
                </button>
              </div>
            </div>
          )}
          <div
            ref={containerRef}
            className="flex gap-4 overflow-x-auto hide-scrollbar overflow-y-hidden pb-2 cursor-grab w-full"
            style={{ scrollBehavior: 'smooth' }}
          >
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
      </div>
    );
  }

  const handleSectionChange = (nextSection) => {
    if (nextSection === section) return;
    setSection(nextSection);
  };

  return (
    <div className="mb-8 w-full max-w-full relative">
      <div className="flex items-center gap-4 mb-4">
        <button
          className={`px-4 py-2 rounded-sm font-semibold transition-colors flex items-center gap-2 ${section === 'favorites' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
          onClick={() => handleSectionChange('favorites')}
          disabled={favorites.length === 0}
        >
          <span>Favorites</span>
          <span className="inline-block min-w-[1.5em] px-2 py-0.5 rounded-full bg-white/80 dark:bg-black/40 text-blue-600 dark:text-blue-300 text-xs font-bold align-middle border border-blue-200 dark:border-blue-700 ml-1">{favorites.length}</span>
        </button>
        <button
          className={`px-4 py-2 rounded-sm font-semibold transition-colors ${section === 'discover' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
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
