import React, { useEffect, useState, useMemo, useRef } from 'react'

// Inject style for zero vertical padding on filter divs
if (typeof document !== 'undefined' && !document.getElementById('filter-zero-padding-style')) {
  const style = document.createElement('style');
  style.id = 'filter-zero-padding-style';
  style.innerHTML = `.filter-zero-padding { padding-top: 0 !important; padding-bottom: 0 !important; }
    .filter-zero-padding:focus-within { padding-top: 0 !important; padding-bottom: 0 !important; }`;
  document.head.appendChild(style);
}
import { fetchStations, fetchTopVoted, fetchTags, fetchCountries, fetchCodecs, searchTagsByName, searchCountriesByName, searchCodecsByName } from '../utils/radiobrowser'
import StationCard from './StationCard'
import Spinner from './Spinner'
import { motion } from 'framer-motion';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import selectStyles from '../utils/selectStyles';

// Stable variants for the station list container to avoid re-triggering the
// slide-in animation on every parent re-render (object identity changes
// caused repeated animates). Use string-based variants which are stable.
const listVariants = {
  initial: { opacity: 0, y: 20 },
  enter: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 }
};

// using shared selectStyles from utils/selectStyles.js for project-wide parity
export default function StationList({ onSelectStation, favorites, toggleFavorite, showOnlyFavorites, setShowOnlyFavorites, nowPlaying = '', theme = 'dark' }) {
  const [filtersOpen, setFiltersOpen] = useState(true);
  const isDark = theme === 'dark';

  // Parse initial values from URL (shareable links)
  const parseInitial = () => {
    if (typeof window === 'undefined') return {
      q: '', page: 1, selectedCountry: null, selectedTags: [], selectedCodec: null
    };
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q') || '';
    const page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);
    const country = params.get('country');
    const tags = params.get('tags');
    const codec = params.get('codec');
    return {
      q,
      page,
      selectedCountry: country ? { value: country, label: country } : null,
      selectedTags: tags ? tags.split(',').filter(Boolean).map(t => ({ value: t, label: t })) : [],
      selectedCodec: codec ? { value: codec, label: codec } : null,
    };
  };

  // Always initialize all filter state from URL on first render
  const initial = useRef(parseInitial()).current;
  const [page, setPage] = useState(initial.page || 1);
  const [perPage, setPerPage] = useState(12);
  const [totalCount, setTotalCount] = useState(null);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState(initial.q || '');
  // local input state for debounced search to avoid excessive API calls
  const [localQ, setLocalQ] = useState(initial.q || '');
  const searchTimeout = useRef(null);
  const [selectedCountry, setSelectedCountry] = useState(initial.selectedCountry);
  const [selectedTags, setSelectedTags] = useState(initial.selectedTags);
  const [selectedCodec, setSelectedCodec] = useState(initial.selectedCodec);

  // Track if first render to avoid running URL sync effect on mount
  const didInit = useRef(false);
  const [countryOptions, setCountryOptions] = useState([])
  const [tagOptions, setTagOptions] = useState([])
  const [codecOptions, setCodecOptions] = useState([])

  // Memoize favorites to avoid unnecessary refreshes
  const stableFavorites = useMemo(() => favorites, [favorites]);

  // Fetch initial country and tag options on mount (for empty input)
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const countries = await fetchCountries();
        if (isMounted) setCountryOptions((countries || []).map(c => ({ value: c.name, label: c.name })));
      } catch (err) {
        if (isMounted) setCountryOptions([]);
      }
      try {
        const tags = await fetchTags();
        if (isMounted) setTagOptions((tags || []).map(t => ({ value: t.name, label: t.name })));
      } catch (err) {
        if (isMounted) setTagOptions([]);
      }
      try {
        const codecs = await fetchCodecs();
        if (isMounted) setCodecOptions((codecs || []).map(c => ({ value: c.name, label: c.name })));
      } catch (err) {
        if (isMounted) setCodecOptions([]);
      }
    })();
    return () => { isMounted = false };
  }, []);

  // Async load options for react-select (countries)
  const loadCountryOptions = async (inputValue, callback) => {
    const results = await searchCountriesByName(inputValue || '');
    callback((results || []).map(c => ({ value: c.name, label: c.name })));
  };

  const loadTagOptions = async (inputValue, callback) => {
    const results = await searchTagsByName(inputValue || '');
    callback((results || []).map(t => ({ value: t.name, label: t.name })));
  };

  const loadCodecOptions = async (inputValue, callback) => {
    const results = await searchCodecsByName(inputValue || '');
    callback((results || []).map(c => ({ value: c.name, label: c.name })));
  };

  // Filtering logic for countries (OR) and tags (AND/OR)
  useEffect(() => {
  async function load() {
      setLoading(true)
      try {
        if (showOnlyFavorites) {
          const start = (page - 1) * perPage
          const slice = stableFavorites.slice(start, start + perPage)
          setStations(slice)
          // we know total when showing favorites
          setTotalCount(stableFavorites.length)
        } else {
          let country = selectedCountry ? selectedCountry.value : '';
          let tagList = selectedTags.length ? selectedTags.map(t => t.value) : [];
          let codec = selectedCodec ? selectedCodec.value : '';
          const results = await fetchStations({ page, perPage, name: q, countries: country ? [country] : [], tags: tagList, codecs: codec ? [codec] : [] });
          setStations(results || []);
          // Radio Browser JSON API doesn't provide a total result count in this endpoint.
          // We can't know the full count without additional server-side support, so
          // clear totalCount when using remote search (unknown).
          setTotalCount(null);
        }
      } catch (err) {
        console.error(err)
        setStations([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [page, perPage, q, selectedCountry, selectedTags, selectedCodec, showOnlyFavorites, stableFavorites])

  // Keep localQ in sync with q (e.g., cleared or set programmatically)
  useEffect(() => {
    setLocalQ(q || '');
  }, [q]);

  // Reflect key filter/search state in the URL so it can be shared/bookmarked
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!didInit.current) {
      didInit.current = true;
      return;
    }
    const params = new URLSearchParams(window.location.search);
    if (q) params.set('q', q); else params.delete('q');
    if (page && page > 1) params.set('page', String(page)); else params.delete('page');
    if (selectedCountry && selectedCountry.value) params.set('country', selectedCountry.value); else params.delete('country');
    if (selectedTags && selectedTags.length) params.set('tags', selectedTags.map(t => t.value).join(',')); else params.delete('tags');
    if (selectedCodec && selectedCodec.value) params.set('codec', selectedCodec.value); else params.delete('codec');
    const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : '');
    if (newUrl !== window.location.pathname + window.location.search) {
      window.history.replaceState({}, '', newUrl);
    }
  }, [q, page, selectedCountry, selectedTags, selectedCodec]);

  // Cleanup pending debounce on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
        searchTimeout.current = null;
      }
    };
  }, []);

  function onSearchSubmit(e) {
    e.preventDefault()
    setPage(1)
  }

  function clearCountry() {
    setSelectedCountry(null);
    setPage(1);
  }
  function clearTags() {
    setSelectedTags([]);
    setPage(1);
  }
  function clearCodec() {
    setSelectedCodec(null);
    setPage(1);
  }

  return (
    <motion.div
      variants={listVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      className="space-y-4 min-w-0"
    >
  <div className="sticky top-4 z-20">
    <div className="flex items-center justify-between md:hidden mb-2">
      <div className="text-sm font-medium">Filters</div>
      <button type="button" aria-expanded={filtersOpen} aria-controls="filters-form" onClick={() => setFiltersOpen(v => !v)} className="px-2 py-1 rounded glass">
        <svg className={`w-4 h-4 transform transition-transform ${filtersOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  <form id="filters-form" onSubmit={onSearchSubmit} className={`p-4 rounded-2xl shadow-xl glass grid grid-cols-1 md:grid-cols-4 gap-3 items-end ${filtersOpen ? 'block' : 'hidden md:grid'}`}>
        <div className="md:col-span-2">
          <label className="text-xs text-gray-400 flex items-center justify-between" style={{marginBottom: '0.3rem'}}>
            Search
            {(localQ || selectedCountry || (selectedTags && selectedTags.length) || selectedCodec) && (
              <button
                type="button"
                onClick={() => {
                  // clear all filters and reset page
                  if (searchTimeout.current) { clearTimeout(searchTimeout.current); searchTimeout.current = null }
                  setLocalQ(''); setQ(''); setSelectedCountry(null); setSelectedTags([]); setSelectedCodec(null); setPage(1);
                }}
                className="text-xs text-blue-500 font-medium rounded px-2 py-1 hover:bg-blue-50 dark:hover:bg-white/5"
                aria-label="Clear all filters"
                title="Clear all filters"
              >
                Clear all
              </button>
            )}
          </label>
          <div className="relative">
            <div className="w-full rounded-lg px-3 py-2 backdrop-blur-sm" style={{
              backgroundColor: isDark ? 'rgba(8,10,12,0.62)' : 'rgba(255,255,255,0.30)',
              border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.06)'
            }}>
              <input
              value={localQ}
              onChange={e => {
                const v = e.target.value;
                setLocalQ(v);
                // debounce updating the real query used by the loader
                if (searchTimeout.current) clearTimeout(searchTimeout.current);
                searchTimeout.current = setTimeout(() => {
                  setQ(v);
                  setPage(1);
                  searchTimeout.current = null;
                }, 350);
              }}
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  // clear immediately on Escape
                  if (searchTimeout.current) { clearTimeout(searchTimeout.current); searchTimeout.current = null }
                  setLocalQ(''); setQ(''); setPage(1);
                }
              }}
              placeholder="Station name..."
              className="w-full text-base bg-transparent placeholder-gray-500 dark:placeholder-gray-300 text-gray-900 dark:text-gray-100 outline-none"
              style={{ boxSizing: 'border-box', minHeight: '2rem', fontSize: '1rem' }}
            />
            </div>
            {localQ && (
              <button
                type="button"
                aria-label="Clear search"
                title="Clear search"
                onClick={() => {
                  if (searchTimeout.current) { clearTimeout(searchTimeout.current); searchTimeout.current = null }
                  setLocalQ(''); setQ(''); setPage(1);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/5"
              >
                <svg className="w-4 h-4 text-gray-700 dark:text-gray-200" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 8.586L15.95 2.636a1 1 0 111.414 1.414L11.414 10l5.95 5.95a1 1 0 11-1.414 1.414L10 11.414l-5.95 5.95A1 1 0 112.636 15.95L8.586 10 2.636 4.05A1 1 0 114.05 2.636L10 8.586z" clipRule="evenodd" />
                </svg>
              </button>
            )}
            {loading && (
              <Spinner className="absolute right-10 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-300" />
            )}
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 flex items-center justify-between">Country
            {selectedCountry && <button type="button" className="ml-2 text-xs text-blue-600 underline" onClick={clearCountry}>Clear</button>}
          </label>
          <AsyncSelect
            isMulti={false}
            value={selectedCountry}
            onChange={v => setSelectedCountry(v)}
            className="mt-1 w-full"
            classNamePrefix="select"
            placeholder="Select country..."
            closeMenuOnSelect={true}
            menuPlacement="auto"
            styles={selectStyles(theme)}
            loadOptions={loadCountryOptions}
            defaultOptions={countryOptions}
            isClearable={false}
            cacheOptions
            isSearchable
            menuPortalTarget={typeof window !== 'undefined' ? window.document.body : undefined}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 flex items-center justify-between">Tag / Category
            {selectedTags.length > 0 && <button type="button" className="ml-2 text-xs text-blue-600 underline" onClick={clearTags}>Clear</button>}
          </label>
          <AsyncSelect
            isMulti
            value={selectedTags}
            onChange={v => setSelectedTags(v || [])}
            className="mt-1 w-full"
            classNamePrefix="select"
            placeholder="Select tags..."
            closeMenuOnSelect={false}
            menuPlacement="auto"
            styles={selectStyles(theme)}
            loadOptions={loadTagOptions}
            defaultOptions={tagOptions}
            isClearable={false}
            cacheOptions
            isSearchable
            menuPortalTarget={typeof window !== 'undefined' ? window.document.body : undefined}
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 flex items-center justify-between">Codec
            {selectedCodec && <button type="button" className="ml-2 text-xs text-blue-600 underline" onClick={clearCodec}>Clear</button>}
          </label>
          <AsyncSelect
            isMulti={false}
            value={selectedCodec}
            onChange={v => setSelectedCodec(v)}
            className="mt-1 w-full"
            classNamePrefix="select"
            placeholder="Select codec..."
            closeMenuOnSelect={true}
            menuPlacement="auto"
            styles={selectStyles(theme)}
            loadOptions={loadCodecOptions}
            defaultOptions={codecOptions}
            isClearable={false}
            cacheOptions
            isSearchable
            menuPortalTarget={typeof window !== 'undefined' ? window.document.body : undefined}
          />
          <label className="ml-auto flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showOnlyFavorites} onChange={(e) => { setShowOnlyFavorites(e.target.checked); setPage(1) }} />
            Show favorites only
          </label>
        </div>
      </form>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? <div className="p-6 rounded-lg shadow-lg bg-gray-200 dark:bg-gray-700">Loading...</div> :
      stations.length ? stations.map(st => (
            <StationCard
              key={st.stationuuid}
              station={st}
              onPlay={() => {
                onSelectStation(st);
              }}
              isFav={!!stableFavorites.find(f => f.stationuuid === st.stationuuid)}
              onToggleFav={() => toggleFavorite(st)}
              nowPlaying={nowPlaying}
            />
          )) : <div className="p-6 rounded-lg shadow-lg bg-gray-200 dark:bg-gray-700">No stations</div>
        }
      </div>

      <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-2">
        <div className="flex flex-col md:flex-row w-full items-center justify-between gap-2">
          <div className="text-xs text-gray-500 flex-1">
            {stations.length > 0 ? (
              (() => {
                const start = (page - 1) * perPage + 1;
                const end = start + stations.length - 1;
                return (
                  <span>
                    Showing <span className="font-medium text-gray-700">{start}–{end}</span>
                    {totalCount ? <span> of <span className="font-medium">{totalCount}</span></span> : ''}
                  </span>
                );
              })()
            ) : (
              <span className="text-gray-400">No results</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-500" htmlFor="per-page-select">Per page:</label>
            <select
              id="per-page-select"
              value={perPage}
              onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
              className="text-xs rounded px-2 py-1 bg-gray-100 dark:bg-gray-800 border"
            >
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={48}>48</option>
            </select>
          </div>

          <nav className="flex items-center gap-2" aria-label="Pagination">
            <button
              aria-label="Previous page"
              title="Previous page"
              className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 disabled:opacity-50 text-xs font-medium"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              &larr; Prev
            </button>
            <span className="text-xs text-gray-700">
              Page <span className="font-semibold">{page}</span>
              {totalCount && totalCount > 0 ? (
                <span> of <span className="font-semibold">{Math.ceil(totalCount / perPage)}</span></span>
              ) : null}
            </span>
            <button
              aria-label="Next page"
              title="Next page"
              className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 disabled:opacity-50 text-xs font-medium"
              onClick={() => setPage(p => p + 1)}
              disabled={(!showOnlyFavorites && stations.length < perPage) || (showOnlyFavorites && totalCount !== null && page * perPage >= totalCount)}
            >
              Next &rarr;
            </button>
          </nav>
        </div>
      </div>
  </div>
    </motion.div>
  );
}
