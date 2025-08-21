import React, { useState, useEffect, useRef } from 'react';
import { fetchTopVoted } from '../utils/radiobrowser';
import StationCardCarousel from './StationCardCarousel';

function FavoritesCarousel({ favorites, onSelectStation, toggleFavorite }) {
  const [start, setStart] = useState(0);
  const [perPage, setPerPage] = useState(5);
  const end = start + perPage;
  const maxStart = Math.max(0, favorites.length - perPage);
  const canPrev = start > 0;
  const canNext = start < maxStart;
  const containerRef = useRef(null);

  // recompute perPage based on container width and item width
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const recompute = () => {
      const cw = container.clientWidth || container.getBoundingClientRect().width || 0;
      const first = container.children?.[0];
      if (!first) {
        setPerPage(1);
        return;
      }
      const itemWidth = first.getBoundingClientRect().width || 0;
      const style = window.getComputedStyle(container);
      const gap = parseFloat(style.gap) || 16;
      const newPerPage = Math.max(1, Math.floor(cw / (itemWidth + gap)));
      setPerPage(prev => prev === newPerPage ? prev : newPerPage);
    };

    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(container);
    window.addEventListener('resize', recompute);
    return () => { ro.disconnect(); window.removeEventListener('resize', recompute); };
  }, [favorites.length]);

  // clamp and align start when favorites or perPage change
  useEffect(() => {
    const newMax = Math.max(0, favorites.length - perPage);
    setStart(s => Math.min(newMax, Math.floor(s / Math.max(1, perPage)) * perPage));
  }, [favorites.length, perPage]);

  // scroll the carousel so the active window is visible
  useEffect(() => {
    try {
      const container = containerRef.current;
      const child = container?.children?.[start];
      if (child && typeof child.scrollIntoView === 'function') {
        child.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
      }
    } catch (err) {
      // ignore scrolling errors
    }
  }, [start]);

  // Sync start when user manually scrolls (debounced)
  const scrollTimeoutRef = useRef(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onScroll = () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        const pageWidth = container.clientWidth || container.offsetWidth || 1;
        const pageNum = Math.round((container.scrollLeft || 0) / pageWidth);
        setStart(prev => Math.min(maxStart, pageNum * perPage));
      }, 120);
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', onScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [perPage, maxStart]);

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold">Favorite Radios</h2>
        <div>
          <button
            onClick={() => {
              const container = containerRef.current;
              if (container) {
                const pageWidth = container.clientWidth || container.offsetWidth || 0;
                container.scrollBy({ left: -pageWidth, behavior: 'smooth' });
              }
              setStart(s => Math.max(0, s - perPage));
            }}
            disabled={!canPrev}
            className="px-2 py-1 mx-1 rounded bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
          >&#8592;</button>
          <button
            onClick={() => {
              const container = containerRef.current;
              if (container) {
                const pageWidth = container.clientWidth || container.offsetWidth || 0;
                container.scrollBy({ left: pageWidth, behavior: 'smooth' });
              }
              setStart(s => Math.min(maxStart, s + perPage));
            }}
            disabled={!canNext}
            className="px-2 py-1 mx-1 rounded bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
          >&#8594;</button>
        </div>
      </div>
  <div ref={containerRef} className="flex gap-4 overflow-x-auto hide-scrollbar overflow-y-hidden pb-2">
        {favorites.slice(start, end).map(station => (
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
    const [start, setStart] = useState(0);
    const [perPage, setPerPage] = useState(5);
    const end = start + perPage;
    const [stations, setStations] = useState([]);
    const [loading, setLoading] = useState(true);
    const containerRef = useRef(null);

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

    const maxStart = Math.max(0, stations.length - perPage);
    const canPrev = start > 0;
    const canNext = start < maxStart;

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const recompute = () => {
        const cw = container.clientWidth || container.getBoundingClientRect().width || 0;
        const first = container.children?.[0];
        if (!first) {
          setPerPage(1);
          return;
        }
        const itemWidth = first.getBoundingClientRect().width || 0;
        const style = window.getComputedStyle(container);
        const gap = parseFloat(style.gap) || 16;
        const newPerPage = Math.max(1, Math.floor(cw / (itemWidth + gap)));
        setPerPage(prev => prev === newPerPage ? prev : newPerPage);
      };

      recompute();
      const ro = new ResizeObserver(recompute);
      ro.observe(container);
      window.addEventListener('resize', recompute);
      return () => { ro.disconnect(); window.removeEventListener('resize', recompute); };
    }, [stations.length]);

    useEffect(() => {
      const newMax = Math.max(0, stations.length - perPage);
      setStart(s => Math.min(newMax, Math.floor(s / Math.max(1, perPage)) * perPage));
    }, [stations.length, perPage]);

    useEffect(() => {
      try {
        const container = containerRef.current;
        const child = container?.children?.[start];
        if (child && typeof child.scrollIntoView === 'function') {
          child.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
        }
      } catch (err) {}
    }, [start]);

    const scrollTimeoutRef2 = useRef(null);
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;
      const onScroll = () => {
        if (scrollTimeoutRef2.current) clearTimeout(scrollTimeoutRef2.current);
        scrollTimeoutRef2.current = setTimeout(() => {
          const pageWidth = container.clientWidth || container.offsetWidth || 1;
          const pageNum = Math.round((container.scrollLeft || 0) / pageWidth);
          setStart(prev => Math.min(maxStart, pageNum * perPage));
        }, 120);
      };
      container.addEventListener('scroll', onScroll, { passive: true });
      return () => {
        container.removeEventListener('scroll', onScroll);
        if (scrollTimeoutRef2.current) clearTimeout(scrollTimeoutRef2.current);
      };
    }, [perPage, maxStart]);

    return (
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold">Discover</h2>
          <div>
            <button onClick={() => setStart(s => Math.max(0, s - perPage))} disabled={!canPrev} className="px-2 py-1 mx-1 rounded bg-gray-200 dark:bg-gray-700 disabled:opacity-50">&#8592;</button>
            <button onClick={() => setStart(s => Math.min(maxStart, s + perPage))} disabled={!canNext} className="px-2 py-1 mx-1 rounded bg-gray-200 dark:bg-gray-700 disabled:opacity-50">&#8594;</button>
          </div>
        </div>
        <div ref={containerRef} className="flex gap-4 overflow-x-auto hide-scrollbar overflow-y-hidden pb-2">
          {loading ? (
            <div className="text-gray-500">Loading...</div>
          ) : (
            stations.slice(start, end).map(station => (
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
