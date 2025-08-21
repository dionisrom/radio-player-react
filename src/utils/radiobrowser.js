const BASE = 'https://de1.api.radio-browser.info/json';
let _allTags = null;
let _allCountries = null;
let _allCodecs = null;

// In-memory caches for fetches/searches
const stationsCache = new Map();
const tagsSearchCache = new Map();
const countriesSearchCache = new Map();
const codecsSearchCache = new Map();

export async function fetchStations({page=1, perPage=16, name='', countries=[], tags=[], codecs=[], hidebroken=true} = {}) {
  // Use /stations/search with all filters
  const offset = (page - 1) * perPage;
  const params = new URLSearchParams();
  params.set('limit', perPage);
  params.set('offset', offset);
  if (name) params.set('name', name);
  if (countries && countries.length) params.set('country', countries.join(','));
  if (tags && tags.length) params.set('tagList', tags.join(','));
  if (codecs && codecs.length) params.set('codec', codecs.join(','));
  if (hidebroken) params.set('hidebroken', 'true');
  const url = `${BASE}/stations/search?${params.toString()}`;
  if (stationsCache.has(url)) return stationsCache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Radio Browser API error');
  const data = await res.json();
  stationsCache.set(url, data);
  return data;
}

// Fetch top voted stations using /stations/topvote
export async function fetchTopVoted({ offset = 0, perPage = 12, hidebroken = true } = {}) {
  const params = new URLSearchParams();
  params.set('offset', String(offset));
  params.set('limit', String(perPage));
  if (hidebroken) params.set('hidebroken', 'true');
  const url = `${BASE}/stations/topvote?${params.toString()}`;
  if (stationsCache.has(url)) return stationsCache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Radio Browser API error');
  const data = await res.json();
  stationsCache.set(url, data);
  return data;
}



// Cache for fetchTags API call
let _fetchTagsPromise = null;
export async function fetchTags() {
  if (_allTags) return _allTags;
  if (_fetchTagsPromise) return _fetchTagsPromise;
  _fetchTagsPromise = fetch(`${BASE}/tags?hidebroken=true&order=stationcount&reverse=true`)
    .then(res => res.ok ? res.json() : [])
    .then(data => {
      _allTags = data;
      return data;
    });
  return _fetchTagsPromise;
}


// Cache for fetchCountries API call
let _fetchCountriesPromise = null;
export async function fetchCountries() {
  if (_allCountries) return _allCountries;
  if (_fetchCountriesPromise) return _fetchCountriesPromise;
  _fetchCountriesPromise = fetch(`${BASE}/countries?hidebroken=true&order=name`)
    .then(res => res.ok ? res.json() : [])
    .then(data => {
      _allCountries = data;
      return data;
    });
  return _fetchCountriesPromise;
}


// Cache for fetchCodecs API call
let _fetchCodecsPromise = null;
export async function fetchCodecs() {
  if (_allCodecs) return _allCodecs;
  if (_fetchCodecsPromise) return _fetchCodecsPromise;
  _fetchCodecsPromise = fetch(`${BASE}/codecs?hidebroken=true&order=stationcount&reverse=true`)
    .then(res => res.ok ? res.json() : [])
    .then(data => {
      _allCodecs = data;
      return data;
    });
  return _fetchCodecsPromise;
}

// In-memory search helpers
export async function searchTagsByName(q) {
  const key = q.toLowerCase();
  if (tagsSearchCache.has(key)) return tagsSearchCache.get(key);
  const tags = await fetchTags();
  let result;
  if (!q || q.length < 1) result = tags;
  else result = tags.filter(t => t.name && t.name.toLowerCase().includes(key));
  tagsSearchCache.set(key, result);
  return result;
}

export async function searchCountriesByName(q) {
  const key = q.toLowerCase();
  if (countriesSearchCache.has(key)) return countriesSearchCache.get(key);
  const countries = await fetchCountries();
  let result;
  if (!q || q.length < 1) result = countries;
  else result = countries.filter(c => c.name && c.name.toLowerCase().includes(key));
  countriesSearchCache.set(key, result);
  return result;
}

export async function searchCodecsByName(q) {
  const key = q.toLowerCase();
  if (codecsSearchCache.has(key)) return codecsSearchCache.get(key);
  const codecs = await fetchCodecs();
  let result;
  if (!q || q.length < 1) result = codecs;
  else result = codecs.filter(c => c.name && c.name.toLowerCase().includes(key));
  codecsSearchCache.set(key, result);
  return result;
}
