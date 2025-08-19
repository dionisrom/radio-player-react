import React from 'react'
import StationCard from './StationCard'

// A thin wrapper that forces a fixed width for horizontal carousels
// so each item has identical dimensions while leaving the base StationCard
// untouched for the grid/list view.
// widthClass prop allows per-usage customization; default classes provide
// a slightly narrower base with smooth scaling on small -> large screens.
export default function StationCardCarousel({ widthClass = 'w-48 sm:w-52 md:w-56 lg:w-64 xl:w-72', ...props }) {
  return (
    <div className={`flex-shrink-0 ${widthClass}`}>
      <StationCard {...props} />
    </div>
  )
}
