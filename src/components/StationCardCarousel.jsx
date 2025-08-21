import React from 'react'
import StationCard from './StationCard'

// A thin wrapper that forces a fixed width for horizontal carousels
// so each item has identical dimensions while leaving the base StationCard
// untouched for the grid/list view.
// widthClass prop allows per-usage customization; default classes provide
// a slightly narrower base with smooth scaling on small -> large screens.
function StationCardCarousel({ widthClass = 'w-48 sm:w-52 md:w-56 lg:w-64 xl:w-72', station, onPlay, isFav, onToggleFav, nowPlaying }) {
  return (
    <div className={`shrink-0 ${widthClass}`}>
      <StationCard station={station} onPlay={onPlay} isFav={isFav} onToggleFav={onToggleFav} nowPlaying={nowPlaying} />
    </div>
  )
}

export default React.memo(StationCardCarousel);
