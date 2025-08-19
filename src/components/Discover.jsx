import React, { useEffect, useState } from 'react';
import { fetchStations } from '../utils/radiobrowser';
import StationCard from './StationCard';
import StationCardCarousel from './StationCardCarousel';
import { motion } from 'framer-motion';

export default function Discover({ onSelectStation, favorites, toggleFavorite }) {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTrendingStations() {
      setLoading(true);
      try {
        const trendingStations = await fetchStations({ perPage: 10 });
        setStations(trendingStations);
      } catch (err) {
        console.error('Failed to fetch trending stations:', err);
        setStations([]);
      } finally {
        setLoading(false);
      }
    }

    loadTrendingStations();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className=""
    >
      <h2 className="text-xl font-bold mb-2">Discover Trending Stations</h2>
      {loading ? (
        <div className="text-center text-gray-500">Loading...</div>
      ) : stations.length ? (
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-700 dark:scrollbar-track-gray-900">
          {stations.map((station) => (
            <StationCardCarousel
              key={station.stationuuid}
              station={station}
              onPlay={() => onSelectStation(station)}
              isFav={!!favorites.find(f => f.stationuuid === station.stationuuid)}
              onToggleFav={() => toggleFavorite(station)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500">No trending stations available.</div>
      )}
    </motion.div>
  );
}
