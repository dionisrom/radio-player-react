import React, { useEffect, useState, useMemo } from 'react'

// Inject style for zero vertical padding on filter divs
if (typeof document !== 'undefined' && !document.getElementById('filter-zero-padding-style')) {
  const style = document.createElement('style');
  style.id = 'filter-zero-padding-style';
  style.innerHTML = `.filter-zero-padding { padding-top: 0 !important; padding-bottom: 0 !important; }
    .filter-zero-padding:focus-within { padding-top: 0 !important; padding-bottom: 0 !important; }`;
  document.head.appendChild(style);
}
import { fetchStations, fetchTags, fetchCountries, fetchCodecs, searchTagsByName, searchCountriesByName, searchCodecsByName } from '../utils/radiobrowser'
import StationCard from './StationCard'
import { motion } from 'framer-motion';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';

const selectStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: 'rgba(255,255,255,0.35)', // glassmorphism
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    borderRadius: '0.75rem', // more rounded
    borderColor: state.isFocused ? '#3b82f6' : 'rgba(255,255,255,0.25)',
    boxShadow: state.isFocused ? '0 0 0 2px #3b82f6, 0 8px 32px 0 rgba(31,38,135,0.15)' : '0 8px 32px 0 rgba(31,38,135,0.10)',
    minHeight: '2.5rem',
    fontSize: '1rem',
    color: '#1e293b',
    padding: '0.5rem 0.75rem',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    outline: state.isFocused ? '2px solid #3b82f6' : 'none',
    outlineOffset: '0',
    boxSizing: 'border-box',
    backdropBlendMode: 'overlay',
  }),
  valueContainer: (base) => ({
    ...base,
    padding: 0,
    paddingLeft: 0,
  }),
  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
    color: '#1e293b',
    fontSize: '1rem',
    backgroundColor: 'transparent',
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'rgba(255,255,255,0.85)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    borderRadius: '0.75rem',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)',
    zIndex: 9999,
    fontSize: '1rem',
    border: '1px solid rgba(255,255,255,0.25)',
  }),
  menuPortal: base => ({
    ...base,
    zIndex: 9999,
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderRadius: '0.5rem',
    color: '#2563eb',
    fontWeight: 500,
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: '#2563eb',
    fontWeight: 500,
    paddingRight: 4,
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: '#2563eb',
    ':hover': { backgroundColor: '#3b82f6', color: 'white' },
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? '#3b82f6'
      : state.isFocused
      ? 'rgba(59,130,246,0.08)'
      : 'transparent',
    color: state.isSelected ? 'white' : '#1e293b',
    fontWeight: state.isSelected ? 600 : 400,
    cursor: 'pointer',
  }),
  placeholder: (base, state) => ({
    ...base,
    color: typeof window !== 'undefined' && document.documentElement.classList.contains('dark')
      ? '#cbd5e1' // light slate for dark mode
      : '#64748b',
    fontWeight: 400,
    fontSize: '1rem',
  }),
  singleValue: (base) => ({
    ...base,
    color: '#1e293b',
    fontSize: '1rem',
  }),
};

export default function StationList({ onSelectStation, favorites, toggleFavorite, showOnlyFavorites, setShowOnlyFavorites, nowPlaying = '' }) {
  const [page, setPage] = useState(1)
  const [perPage] = useState(12)
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [selectedTags, setSelectedTags] = useState([])
  const [selectedCodec, setSelectedCodec] = useState(null)
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
          setStations(stableFavorites.slice(start, start + perPage))
        } else {
          let country = selectedCountry ? selectedCountry.value : '';
          let tagList = selectedTags.length ? selectedTags.map(t => t.value) : [];
          let codec = selectedCodec ? selectedCodec.value : '';
          const results = await fetchStations({ page, perPage, name: q, countries: country ? [country] : [], tags: tagList, codecs: codec ? [codec] : [] });
          setStations(results || []);
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="space-y-4"
    >
  <form onSubmit={onSearchSubmit} className="p-4 rounded-lg shadow-lg bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-white/20 dark:border-black/20 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div className="md:col-span-2">
          <label className="text-xs text-gray-500 flex items-center justify-between" style={{marginBottom: '0.3rem'}}>Search</label>
          <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#e5e7eb', borderRadius: '0.375rem', border: '1px solid #e5e7eb', minHeight: '2.5rem' }}>
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Station name..."
              className="w-full mt-1 text-base text-slate-800 transition-colors"
              style={{
                boxSizing: 'border-box',
                backgroundColor: '#e5e7eb',
                border: '1px solid #e5e7eb',
                borderRadius: '0.375rem',
                minHeight: '2rem',
                outline: 'none',
                fontSize: '1rem',
              }}
              onFocus={e => e.target.style.boxShadow = '0 0 0 2px #e5e7eb'}
              onBlur={e => e.target.style.boxShadow = 'none'}
            />
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
            styles={selectStyles}
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
            styles={selectStyles}
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
            styles={selectStyles}
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

      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-500">Page {page}</div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700" onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
          <button className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700" onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      </div>
    </motion.div>
  );
}
